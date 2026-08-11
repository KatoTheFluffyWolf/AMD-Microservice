using System.ComponentModel.DataAnnotations;

namespace PollMana.Models;

public class PollOption
{
    public long OptionID { get; set; }
    public long PollID { get; set; }
    public short OptionIndex { get; set; }
    [Required, MaxLength(200)] public string OptionText { get; set; } = string.Empty;
    public Poll? Poll { get; set; }
}
