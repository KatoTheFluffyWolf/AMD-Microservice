using Microsoft.EntityFrameworkCore;
using VoteMana.Data;
using VoteMana.Models;

namespace VoteMana.Services;

public enum SubmitVoteStatus { Success, PollNotFound, PollClosed, InvalidOption, AlreadyVoted }
public record SubmitVoteOutcome(SubmitVoteStatus Status, DateTime? SubmittedAt = null);

public class VoteService
{
    private readonly VoteContext _context;
    private readonly PollServiceClient _pollServiceClient;
    public VoteService(VoteContext context, PollServiceClient pollServiceClient) { _context = context; _pollServiceClient = pollServiceClient; }

    public async Task<SubmitVoteOutcome> SubmitAsync(string code, string voterToken, short optionIndex)
    {
        var poll = await _pollServiceClient.GetPollAsync(code);
        if (poll == null) return new(SubmitVoteStatus.PollNotFound);
        if (poll.IsClosed) return new(SubmitVoteStatus.PollClosed);

        var selectedOption = poll.Options.SingleOrDefault(o => o.OptionIndex == optionIndex);
        if (selectedOption == null) return new(SubmitVoteStatus.InvalidOption);
        if (await _context.Votes.AnyAsync(v => v.PollID == poll.PollID && v.VoterToken == voterToken)) return new(SubmitVoteStatus.AlreadyVoted);

        var submittedAt = DateTime.UtcNow;
        _context.Votes.Add(new Vote { PollID = poll.PollID, PollOptionID = selectedOption.OptionID, VoterToken = voterToken, VotedAt = submittedAt });
        try { await _context.SaveChangesAsync(); return new(SubmitVoteStatus.Success, submittedAt); }
        catch (DbUpdateException) { return new(SubmitVoteStatus.AlreadyVoted); }
    }
}
