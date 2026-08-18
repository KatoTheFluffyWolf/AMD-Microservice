using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PollMana.Data;
using VoteMana.Data;
using VoteMana.Models;
using VoteMana.Services;

namespace Backend.UnitTests;

internal static class TestFactory
{
    public static PollContext CreatePollContext()
    {
        var options = new DbContextOptionsBuilder<PollContext>()
            .UseInMemoryDatabase($"poll-tests-{Guid.NewGuid()}")
            .Options;

        return new PollContext(options);
    }

    public static VoteContext CreateVoteContext()
    {
        var options = new DbContextOptionsBuilder<VoteContext>()
            .UseInMemoryDatabase($"vote-tests-{Guid.NewGuid()}")
            .Options;

        return new VoteContext(options);
    }

    public static PollServiceClient CreatePollServiceClient(PollApiDto? poll)
    {
        var handler = new StubHttpMessageHandler(_ =>
        {
            if (poll is null)
                return new HttpResponseMessage(HttpStatusCode.NotFound);

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(poll)
            };
        });

        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://unit-test.local/")
        };

        return new PollServiceClient(
            httpClient,
            NullLogger<PollServiceClient>.Instance);
    }

    public static PollApiDto OpenPoll() => new()
    {
        PollID = 10,
        Code = "ABC123",
        Question = "Which option do you prefer?",
        IsClosed = false,
        Options =
        [
            new PollApiOptionDto
            {
                OptionID = 100,
                OptionIndex = 0,
                OptionText = "Option A"
            },
            new PollApiOptionDto
            {
                OptionID = 101,
                OptionIndex = 1,
                OptionText = "Option B"
            }
        ]
    };

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(responseFactory(request));
        }
    }
}