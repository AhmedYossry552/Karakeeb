namespace Recycling.Application.Contracts.Wallet;

public class AddUserTransactionResponse
{
    public string Message { get; set; } = null!;
    public UserTransactionDto Transaction { get; set; } = null!;
    public decimal NewBalance { get; set; }
}
