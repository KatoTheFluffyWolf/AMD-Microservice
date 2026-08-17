using Microsoft.AspNetCore.SignalR;

namespace VoteMana.Hubs;

public class PollHub : Hub
{
    public Task JoinPollGroup(string code) => Groups.AddToGroupAsync(Context.ConnectionId, code);
    public Task LeavePollGroup(string code) => Groups.RemoveFromGroupAsync(Context.ConnectionId, code);
}
