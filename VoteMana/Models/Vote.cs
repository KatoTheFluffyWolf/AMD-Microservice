namespace VoteMana.Models;

public class Vote
{
    public long VoteID { get; set; }
    public long PollID { get; set; }
    public long PollOptionID { get; set; }
    public string UserID { get; set; } = string.Empty;
    public DateTime VotedAt { get; set; }
    public PollReference? Poll { get; set; }
    public PollOptionReference? PollOption { get; set; }
    public UserReference? User { get; set; }
}
