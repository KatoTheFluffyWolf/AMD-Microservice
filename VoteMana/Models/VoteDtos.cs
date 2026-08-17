using System.ComponentModel.DataAnnotations;

namespace VoteMana.Models;

public class SubmitVoteDto
{
    [Required, Range(0, 5)] public short? OptionIndex { get; set; }
    [Required, MaxLength(128)] public string VoterToken { get; set; } = string.Empty;
}
public class PollApiOptionDto { public long OptionID { get; set; } public short OptionIndex { get; set; } public string OptionText { get; set; } = string.Empty; }
public class PollApiDto { public long PollID { get; set; } public string Code { get; set; } = string.Empty; public string Question { get; set; } = string.Empty; public bool IsClosed { get; set; } public List<PollApiOptionDto> Options { get; set; } = new(); }
public class PollResultOptionDto { public long OptionID { get; set; } public short OptionIndex { get; set; } public string OptionText { get; set; } = string.Empty; public int Votes { get; set; } }
public class PollResultsDto { public long PollID { get; set; } public string Code { get; set; } = string.Empty; public string Question { get; set; } = string.Empty; public bool IsClosed { get; set; } public int TotalVotes { get; set; } public List<PollResultOptionDto> Options { get; set; } = new(); }
public class VoteReceiptDto { public bool Accepted { get; set; } public string Code { get; set; } = string.Empty; public short OptionIndex { get; set; } public DateTime SubmittedAt { get; set; } }
