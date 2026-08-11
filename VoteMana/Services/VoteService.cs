using Microsoft.EntityFrameworkCore;
using VoteMana.Data;
using VoteMana.Models;

namespace VoteMana.Services;

public enum SubmitVoteStatus { Success, PollNotFound, PollClosed, InvalidOption, AlreadyVoted }

public class VoteService
{
    private readonly VoteContext _context;
    private readonly PollServiceClient _pollServiceClient;
    public VoteService(VoteContext context, PollServiceClient pollServiceClient) { _context = context; _pollServiceClient = pollServiceClient; }

    public async Task<SubmitVoteStatus> SubmitAsync(string code, string userId, long optionId)
    {
        var poll = await _pollServiceClient.GetPollAsync(code);
        if (poll == null) return SubmitVoteStatus.PollNotFound;
        if (poll.IsClosed) return SubmitVoteStatus.PollClosed;
        if (!poll.Options.Any(o => o.OptionID == optionId)) return SubmitVoteStatus.InvalidOption;
        if (await _context.Votes.AnyAsync(v => v.PollID == poll.PollID && v.UserID == userId)) return SubmitVoteStatus.AlreadyVoted;

        _context.Votes.Add(new Vote { PollID = poll.PollID, PollOptionID = optionId, UserID = userId, VotedAt = DateTime.UtcNow });
        try { await _context.SaveChangesAsync(); return SubmitVoteStatus.Success; }
        catch (DbUpdateException) { return SubmitVoteStatus.AlreadyVoted; }
    }
}
