using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PollMana.Models;
using PollMana.Services;
using System.Security.Claims;

namespace PollMana.Controllers;

[Route("api/polls")]
[ApiController]
public class PollsController : ControllerBase
{
    private readonly PollService _pollService;
    public PollsController(PollService pollService) => _pollService = pollService;

    [Authorize, HttpPost]
    public async Task<ActionResult<PollDto>> Create(CreatePollDto dto)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        try
        {
            var poll = await _pollService.CreateAsync(userId, dto);
            return CreatedAtAction(nameof(GetPoll), new { code = poll.Code }, poll);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{code}")]
    public async Task<ActionResult<PollDto>> GetPoll(string code)
    {
        var poll = await _pollService.GetByCodeAsync(code);
        return poll == null ? NotFound() : Ok(poll);
    }

    [Authorize, HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<PollDto>>> Mine()
    {
        var userId = CurrentUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        return Ok(await _pollService.GetMineAsync(userId));
    }

    [Authorize, HttpPatch("{code}/close")]
    public async Task<IActionResult> Close(string code)
    {
        var userId = CurrentUserId();
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        return await _pollService.CloseAsync(code, userId) switch
        {
            ClosePollStatus.Success => NoContent(),
            ClosePollStatus.NotFound => NotFound(),
            ClosePollStatus.Forbidden => Forbid(),
            ClosePollStatus.AlreadyClosed => Conflict(new { message = "Poll is already closed." }),
            _ => StatusCode(500)
        };
    }

    private string? CurrentUserId() =>
        User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
}
