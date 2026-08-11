using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using VoteMana.Hubs;
using VoteMana.Models;
using VoteMana.Services;

namespace VoteMana.Controllers;

[Route("api/polls")]
[ApiController]
public class VotesController : ControllerBase
{
    private readonly VoteService _voteService;
    private readonly ResultService _resultService;
    private readonly IHubContext<PollHub> _hubContext;
    public VotesController(VoteService voteService, ResultService resultService, IHubContext<PollHub> hubContext) { _voteService = voteService; _resultService = resultService; _hubContext = hubContext; }

    [Authorize, HttpPost("{code}/vote")]
    public async Task<IActionResult> Vote(string code, SubmitVoteDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        var status = await _voteService.SubmitAsync(code, userId, dto.PollOptionID);
        if (status != SubmitVoteStatus.Success)
        {
            return status switch
            {
                SubmitVoteStatus.PollNotFound => NotFound(new { message = "Poll not found." }),
                SubmitVoteStatus.PollClosed => Conflict(new { message = "This poll is closed." }),
                SubmitVoteStatus.InvalidOption => BadRequest(new { message = "The selected option does not belong to this poll." }),
                SubmitVoteStatus.AlreadyVoted => Conflict(new { message = "You have already voted in this poll." }),
                _ => StatusCode(500)
            };
        }
        var results = await _resultService.GetResultsAsync(code);
        if (results != null) await _hubContext.Clients.Group(code).SendAsync("PollResultsUpdated", results);
        return Ok(results);
    }

    [HttpGet("{code}/results")]
    public async Task<ActionResult<PollResultsDto>> Results(string code)
    {
        var results = await _resultService.GetResultsAsync(code);
        return results == null ? NotFound() : Ok(results);
    }
}
