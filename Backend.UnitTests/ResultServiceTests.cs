using VoteMana.Models;
using VoteMana.Services;
using Xunit;

namespace Backend.UnitTests;

public class ResultServiceTests
{
    [Fact]
    public async Task GetResultsAsync_CountsVotesAndIncludesZeroVoteOptions()
    {
        await using var context = TestFactory.CreateVoteContext();
        context.Votes.AddRange(
            new Vote
            {
                PollID = 10,
                PollOptionID = 100,
                VoterToken = "token-1",
                VotedAt = DateTime.UtcNow
            },
            new Vote
            {
                PollID = 10,
                PollOptionID = 100,
                VoterToken = "token-2",
                VotedAt = DateTime.UtcNow
            });
        await context.SaveChangesAsync();
        var service = new ResultService(
            context,
            TestFactory.CreatePollServiceClient(TestFactory.OpenPoll()));

        var result = await service.GetResultsAsync("ABC123");

        Assert.NotNull(result);
        Assert.Equal(2, result.TotalVotes);
        Assert.Collection(
            result.Options,
            first => Assert.Equal(2, first.Votes),
            second => Assert.Equal(0, second.Votes));
    }
}