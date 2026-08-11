using System.ComponentModel.DataAnnotations;

namespace PollMana.Models;

public class CreatePollDto
{
    [Required, MaxLength(500)] public string Question { get; set; } = string.Empty;
    [Required] public List<string> Options { get; set; } = new();
}

public class PollOptionDto
{
    public long OptionID { get; set; }
    public short OptionIndex { get; set; }
    public string OptionText { get; set; } = string.Empty;
}

public class PollDto
{
    public long PollID { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public List<PollOptionDto> Options { get; set; } = new();
}
