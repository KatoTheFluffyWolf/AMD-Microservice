namespace VoteMana.Models;

public class PollReference { public long PollID { get; set; } }
public class PollOptionReference { public long PollOptionID { get; set; } public long PollID { get; set; } }
