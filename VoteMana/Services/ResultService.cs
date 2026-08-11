using Microsoft.EntityFrameworkCore;
using VoteMana.Data;
using VoteMana.Models;

namespace VoteMana.Services;

public class ResultService
{
    private readonly VoteContext _context;
    private readonly PollServiceClient _pollServiceClient;
    public ResultService(VoteContext context, PollServiceClient pollServiceClient) { _context = context; _pollServiceClient = pollServiceClient; }

    public async Task<PollResultsDto?> GetResultsAsync(string code)
    {
        var poll = await _pollServiceClient.GetPollAsync(code);
        if (poll == null) return null;
        var counts = await _context.Votes.AsNoTracking().Where(v => v.PollID == poll.PollID).GroupBy(v => v.PollOptionID).Select(g => new { OptionID = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.OptionID, x => x.Count);
        var options = poll.Options.OrderBy(o => o.OptionIndex).Select(o => new PollResultOptionDto { OptionID = o.OptionID, OptionIndex = o.OptionIndex, OptionText = o.OptionText, Votes = counts.GetValueOrDefault(o.OptionID, 0) }).ToList();
        return new PollResultsDto { PollID = poll.PollID, Url = poll.Url, Question = poll.Question, IsClosed = poll.IsClosed, TotalVotes = options.Sum(o => o.Votes), Options = options };
    }
}
