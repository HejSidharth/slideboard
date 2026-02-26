import { v } from "convex/values";
import { query } from "./_generated/server";

// ---------------------------------------------------------------------------
// Auth helper (same logic as hostedQuestions.ts)
// ---------------------------------------------------------------------------

async function isValidHost(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { db: any },
  presentationId: string,
  hostToken: string,
): Promise<boolean> {
  if (!hostToken) return false;
  const session = await ctx.db
    .query("hostSessions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_token", (q: any) =>
      q.eq("presentationId", presentationId).eq("token", hostToken),
    )
    .first();
  return session !== null;
}

// ---------------------------------------------------------------------------
// list — unified query merging polls + hostedQuestions
// Returns items sorted descending by createdAt (newest first).
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    presentationId: v.string(),
    participantId: v.string(),
    /** When provided and valid, returns host-only fields. */
    hostToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isHost = args.hostToken
      ? await isValidHost(ctx, args.presentationId, args.hostToken)
      : false;

    // -----------------------------------------------------------------------
    // Fetch polls
    // -----------------------------------------------------------------------
    const polls = await ctx.db
      .query("polls")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_presentation", (q: any) =>
        q.eq("presentationId", args.presentationId),
      )
      .order("desc")
      .take(50);

    const pollActivities = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      polls.map(async (poll: any) => {
        const votes = await ctx.db
          .query("votes")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_poll", (q: any) => q.eq("pollId", poll._id))
          .collect();

        const type: string = poll.pollType ?? "multiple_choice";
        const slotCount = type === "confidence" ? 5 : poll.options.length;
        const voteCounts: number[] = Array(slotCount).fill(0);
        let myVote = -1;

        for (const vote of votes) {
          if (vote.optionIndex >= 0 && vote.optionIndex < slotCount) {
            voteCounts[vote.optionIndex]++;
          }
          if (vote.participantId === args.participantId) {
            myVote = vote.optionIndex;
          }
        }

        const resultsVisible = poll.resultsVisible === true;

        const base = {
          _id: poll._id as string,
          source: "poll" as const,
          createdAt: poll.createdAt as number,
          isActive: poll.isActive as boolean,
          resultsVisible,
          prompt: poll.question as string,
          answerCount: votes.length,
          voteCounts: resultsVisible ? voteCounts : null,
          totalVotes: votes.length,
          myVote,
        };

        if (type === "confidence") {
          return { ...base, kind: "poll_confidence" as const };
        }
        return {
          ...base,
          kind: "poll_mcq" as const,
          options: poll.options as string[],
        };
      }),
    );

    // -----------------------------------------------------------------------
    // Fetch hosted questions
    // -----------------------------------------------------------------------
    const questions = await ctx.db
      .query("hostedQuestions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_presentation", (q: any) =>
        q.eq("presentationId", args.presentationId),
      )
      .order("desc")
      .take(50);

    const questionActivities = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      questions.map(async (hq: any) => {
        const answers = await ctx.db
          .query("hostedAnswers")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_question", (q: any) => q.eq("questionId", hq._id))
          .collect();

        const answerCount: number = answers.length;

        const myAnswerRow = answers.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => a.participantId === args.participantId,
        );
        const myAnswer = myAnswerRow
          ? {
              mcqIndex: myAnswerRow.mcqIndex ?? null,
              freeText: myAnswerRow.freeText ?? null,
            }
          : null;

        const correctIndex: number | null =
          isHost || hq.resultsVisible ? (hq.correctIndex ?? null) : null;

        const answerList = isHost
          ? answers.map((a: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
              participantId: a.participantId as string,
              mcqIndex: a.mcqIndex ?? null,
              freeText: a.freeText ?? null,
              submittedAt: a.submittedAt as number,
            }))
          : null;

        const base = {
          _id: hq._id as string,
          source: "question" as const,
          createdAt: hq.createdAt as number,
          isActive: hq.isActive as boolean,
          resultsVisible: hq.resultsVisible as boolean,
          prompt: hq.prompt as string,
          answerCount,
          timeLimitMs: hq.timeLimitMs ?? null,
          startedAt: hq.startedAt ?? null,
          closedAt: hq.closedAt ?? null,
          myAnswer,
          answers: answerList,
        };

        if (hq.questionType === "mcq") {
          return {
            ...base,
            kind: "question_mcq" as const,
            options: (hq.options ?? []) as string[],
            correctIndex,
          };
        }
        return { ...base, kind: "question_frq" as const };
      }),
    );

    // -----------------------------------------------------------------------
    // Merge and sort newest-first
    // -----------------------------------------------------------------------
    const all = [...pollActivities, ...questionActivities];
    all.sort((a, b) => b.createdAt - a.createdAt);

    return all;
  },
});
