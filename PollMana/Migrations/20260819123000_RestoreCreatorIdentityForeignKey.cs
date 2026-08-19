using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PollMana.Data;

#nullable disable

namespace PollMana.Migrations;

[DbContext(typeof(PollContext))]
[Migration("20260819123000_RestoreCreatorIdentityForeignKey")]
public partial class RestoreCreatorIdentityForeignKey : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddForeignKey(
            name: "FK_Polls_AspNetUsers_CreatorUserID",
            table: "Polls",
            column: "CreatorUserID",
            principalTable: "AspNetUsers",
            principalColumn: "UserID",
            onDelete: ReferentialAction.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Polls_AspNetUsers_CreatorUserID",
            table: "Polls");
    }
}