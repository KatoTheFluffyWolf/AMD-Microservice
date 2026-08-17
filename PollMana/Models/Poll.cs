using System.ComponentModel.DataAnnotations;

namespace PollMana.Models;

public class Poll
{
    public long PollID { get; set; }
    [Required, MaxLength(8)] public string Url { get; set; } = string.Empty;
    [Required] public string CreatorUserID { get; set; } = string.Empty;
    [Required, MaxLength(500)] public string Question { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public ICollection<PollOption> Options { get; set; } = new List<PollOption>();
}
