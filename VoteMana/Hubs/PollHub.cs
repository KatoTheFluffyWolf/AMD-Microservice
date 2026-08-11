using Microsoft.AspNetCore.SignalR;

namespace VoteMana.Hubs;

public class PollHub : Hub
{
    public Task JoinPoll(string code) => Groups.AddToGroupAsync(Context.ConnectionId, code);
    public Task LeavePoll(string code) => Groups.RemoveFromGroupAsync(Context.ConnectionId, code);
}
