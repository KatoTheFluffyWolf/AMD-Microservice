using VoteMana.Models;

namespace VoteMana.Services;

public class PollServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<PollServiceClient> _logger;
    public PollServiceClient(HttpClient httpClient, ILogger<PollServiceClient> logger) { _httpClient = httpClient; _logger = logger; }

    public async Task<PollApiDto?> GetPollAsync(string code)
    {
        try
        {
            var response = await _httpClient.GetAsync($"gateway/polls/{code}");
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Poll service returned {StatusCode} for poll {Code}.", response.StatusCode, code);
                return null;
            }
            return await response.Content.ReadFromJsonAsync<PollApiDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not contact PollMana for poll {Code}.", code);
            return null;
        }
    }
}
