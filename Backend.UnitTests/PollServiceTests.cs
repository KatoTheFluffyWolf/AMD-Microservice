using Microsoft.EntityFrameworkCore;
using PollMana.Models;
using PollMana.Services;
using Xunit;

namespace Backend.UnitTests;

public class PollServiceTests
{
    [Fact]
    public async Task CreateAsync_WithValidInput_CreatesTrimmedPollAndIndexedOptions()
    {
        await using var context = TestFactory.CreatePollContext();
        var service = new PollService(context);
        var request = new CreatePollDto
        {
            Question = "  Which framework do you prefer?  ",
            Options = ["  Vue  ", "React"]
        };

        var result = await service.CreateAsync("auth0|creator-1", request);

        Assert.Equal("Which framework do you prefer?", result.Question);
        Assert.False(result.IsClosed);
        Assert.Equal(6, result.Code.Length);
        Assert.Collection(
            result.Options,
            first =>
            {
                Assert.Equal((short)0, first.OptionIndex);
                Assert.Equal("Vue", first.OptionText);
            },
            second =>
            {
                Assert.Equal((short)1, second.OptionIndex);
                Assert.Equal("React", second.OptionText);
            });
        Assert.Equal(1, await context.Polls.CountAsync());
    }

    [Fact]
    public async Task CreateAsync_WithFewerThanTwoOptions_ThrowsArgumentException()
    {
        await using var context = TestFactory.CreatePollContext();
        var service = new PollService(context);
        var request = new CreatePollDto
        {
            Question = "Only one option?",
            Options = ["Yes"]
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.CreateAsync("auth0|creator-1", request));

        Assert.Contains("between 2 and 6", exception.Message);
        Assert.Empty(context.Polls);
    }

    [Fact]
    public async Task CloseAsync_WhenRequesterIsNotOwner_ReturnsForbiddenAndKeepsPollOpen()
    {
        await using var context = TestFactory.CreatePollContext();
        context.Polls.Add(new Poll
        {
            Url = "ABC123",
            CreatorUserID = "auth0|owner",
            Question = "A test poll",
            CreatedAt = DateTime.UtcNow,
            IsClosed = false
        });
        await context.SaveChangesAsync();
        var service = new PollService(context);

        var status = await service.CloseAsync("ABC123", "auth0|someone-else");

        Assert.Equal(ClosePollStatus.Forbidden, status);
        Assert.False((await context.Polls.SingleAsync()).IsClosed);
    }

    [Fact]
    public async Task CloseAsync_WhenRequesterOwnsPoll_ClosesAndPersistsPoll()
    {
        await using var context = TestFactory.CreatePollContext();
        context.Polls.Add(new Poll
        {
            Url = "ABC123",
            CreatorUserID = "auth0|owner",
            Question = "A test poll",
            CreatedAt = DateTime.UtcNow,
            IsClosed = false
        });
        await context.SaveChangesAsync();
        var service = new PollService(context);

        var status = await service.CloseAsync("ABC123", "auth0|owner");

        var savedPoll = await context.Polls.SingleAsync();
        Assert.Equal(ClosePollStatus.Success, status);
        Assert.True(savedPoll.IsClosed);
        Assert.NotNull(savedPoll.ClosedAt);
    }
}