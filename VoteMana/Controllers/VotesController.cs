using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
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

    [HttpPost("{code}/vote")]
    public async Task<ActionResult<VoteReceiptDto>> Vote(string code, SubmitVoteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VoterToken))
            return BadRequest(new { message = "A voter token is required." });
        if (dto.OptionIndex is null)
            return BadRequest(new { message = "An option index is required." });

        var optionIndex = dto.OptionIndex.Value;
        var outcome = await _voteService.SubmitAsync(code, dto.VoterToken.Trim(), optionIndex);
        if (outcome.Status != SubmitVoteStatus.Success)
        {
            return outcome.Status switch
            {
                SubmitVoteStatus.PollNotFound => NotFound(new { message = "Poll not found." }),
                SubmitVoteStatus.PollClosed => StatusCode(StatusCodes.Status410Gone, new { message = "This poll is closed and no longer accepts votes." }),
                SubmitVoteStatus.InvalidOption => BadRequest(new { message = "The selected option does not belong to this poll." }),
                SubmitVoteStatus.AlreadyVoted => Conflict(new { message = "This voter token has already voted in this poll." }),
                _ => StatusCode(500)
            };
        }
        var results = await _resultService.GetResultsAsync(code);
        if (results != null) await _hubContext.Clients.Group(code).SendAsync("ResultsUpdated", results);
        return Ok(new VoteReceiptDto
        {
            Accepted = true,
            Code = code,
            OptionIndex = optionIndex,
            SubmittedAt = outcome.SubmittedAt ?? DateTime.UtcNow
        });
    }

    [HttpGet("{code}/results")]
    public async Task<ActionResult<PollResultsDto>> Results(string code)
    {
        var results = await _resultService.GetResultsAsync(code);
        return results == null ? NotFound() : Ok(results);
    }
}
