using Microsoft.EntityFrameworkCore;
using VoteMana.Services;
using Xunit;

namespace Backend.UnitTests;

public class VoteServiceTests
{
    [Fact]
    public async Task SubmitAsync_WhenPollDoesNotExist_ReturnsPollNotFound()
    {
        await using var context = TestFactory.CreateVoteContext();
        var pollClient = TestFactory.CreatePollServiceClient(null);
        var service = new VoteService(context, pollClient);

        var result = await service.SubmitAsync("MISSING", "browser-token", 0);

        Assert.Equal(SubmitVoteStatus.PollNotFound, result.Status);
        Assert.Empty(context.Votes);
    }

    [Fact]
    public async Task SubmitAsync_WhenPollIsClosed_ReturnsPollClosed()
    {
        await using var context = TestFactory.CreateVoteContext();
        var poll = TestFactory.OpenPoll();
        poll.IsClosed = true;
        var service = new VoteService(
            context,
            TestFactory.CreatePollServiceClient(poll));

        var result = await service.SubmitAsync("ABC123", "browser-token", 0);

        Assert.Equal(SubmitVoteStatus.PollClosed, result.Status);
        Assert.Empty(context.Votes);
    }

    [Fact]
    public async Task SubmitAsync_WithOptionOutsidePoll_ReturnsInvalidOption()
    {
        await using var context = TestFactory.CreateVoteContext();
        var service = new VoteService(
            context,
            TestFactory.CreatePollServiceClient(TestFactory.OpenPoll()));

        var result = await service.SubmitAsync("ABC123", "browser-token", 5);

        Assert.Equal(SubmitVoteStatus.InvalidOption, result.Status);
        Assert.Empty(context.Votes);
    }

    [Fact]
    public async Task SubmitAsync_WithValidVote_PersistsVoteAndReturnsSuccess()
    {
        await using var context = TestFactory.CreateVoteContext();
        var service = new VoteService(
            context,
            TestFactory.CreatePollServiceClient(TestFactory.OpenPoll()));

        var result = await service.SubmitAsync("ABC123", "browser-token", 1);

        var savedVote = await context.Votes.SingleAsync();
        Assert.Equal(SubmitVoteStatus.Success, result.Status);
        Assert.NotNull(result.SubmittedAt);
        Assert.Equal(10, savedVote.PollID);
        Assert.Equal(101, savedVote.PollOptionID);
        Assert.Equal("browser-token", savedVote.VoterToken);
    }

    [Fact]
    public async Task SubmitAsync_WhenSameTokenVotesAgain_ReturnsAlreadyVoted()
    {
        await using var context = TestFactory.CreateVoteContext();
        var service = new VoteService(
            context,
            TestFactory.CreatePollServiceClient(TestFactory.OpenPoll()));

        var first = await service.SubmitAsync("ABC123", "same-token", 0);
        var second = await service.SubmitAsync("ABC123", "same-token", 1);

        Assert.Equal(SubmitVoteStatus.Success, first.Status);
        Assert.Equal(SubmitVoteStatus.AlreadyVoted, second.Status);
        Assert.Equal(1, await context.Votes.CountAsync());
    }
}