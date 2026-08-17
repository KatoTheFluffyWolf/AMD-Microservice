using Microsoft.EntityFrameworkCore;
using PollMana.Data;
using PollMana.Models;
using System.Security.Cryptography;

namespace PollMana.Services;

public enum ClosePollStatus { Success, NotFound, Forbidden, AlreadyClosed }

public class PollService
{
    private const string CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private readonly PollContext _context;
    public PollService(PollContext context) => _context = context;

    public async Task<PollDto> CreateAsync(string creatorUserId, CreatePollDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Question)) throw new ArgumentException("Question is required.");
        var cleanedOptions = dto.Options.Where(o => !string.IsNullOrWhiteSpace(o)).Select(o => o.Trim()).ToList();
        if (cleanedOptions.Count < 2 || cleanedOptions.Count > 6) throw new ArgumentException("A poll must contain between 2 and 6 answer options.");
        if (cleanedOptions.Any(o => o.Length > 200)) throw new ArgumentException("Each answer option must be 200 characters or fewer.");

        var poll = new Poll
        {
            Url = await GenerateUniqueCodeAsync(), CreatorUserID = creatorUserId, Question = dto.Question.Trim(),
            IsClosed = false, CreatedAt = DateTime.UtcNow,
            Options = cleanedOptions.Select((text, index) => new PollOption { OptionIndex = (short)index, OptionText = text }).ToList()
        };
        _context.Polls.Add(poll);
        await _context.SaveChangesAsync();
        return Map(poll);
    }

    public async Task<PollDto?> GetByCodeAsync(string code)
    {
        var poll = await _context.Polls.AsNoTracking().Include(p => p.Options).FirstOrDefaultAsync(p => p.Url == code);
        return poll == null ? null : Map(poll);
    }

    public async Task<List<PollDto>> GetMineAsync(string creatorUserId)
    {
        var polls = await _context.Polls.AsNoTracking().Include(p => p.Options).Where(p => p.CreatorUserID == creatorUserId).OrderByDescending(p => p.CreatedAt).ToListAsync();
        return polls.Select(Map).ToList();
    }

    public async Task<ClosePollStatus> CloseAsync(string code, string requestingUserId)
    {
        var poll = await _context.Polls.FirstOrDefaultAsync(p => p.Url == code);
        if (poll == null) return ClosePollStatus.NotFound;
        if (poll.CreatorUserID != requestingUserId) return ClosePollStatus.Forbidden;
        if (poll.IsClosed) return ClosePollStatus.AlreadyClosed;
        poll.IsClosed = true; poll.ClosedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return ClosePollStatus.Success;
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var chars = new char[6];
            for (var i = 0; i < chars.Length; i++) chars[i] = CodeCharacters[RandomNumberGenerator.GetInt32(CodeCharacters.Length)];
            var code = new string(chars);
            if (!await _context.Polls.AnyAsync(p => p.Url == code)) return code;
        }
        throw new InvalidOperationException("Could not generate a unique poll code.");
    }

    private static PollDto Map(Poll poll) => new()
    {
        PollID = poll.PollID, Code = poll.Url, Question = poll.Question, IsClosed = poll.IsClosed,
        CreatedAt = poll.CreatedAt, ClosedAt = poll.ClosedAt,
        Options = poll.Options.OrderBy(o => o.OptionIndex).Select(o => new PollOptionDto { OptionID = o.OptionID, OptionIndex = o.OptionIndex, OptionText = o.OptionText }).ToList()
    };
}
