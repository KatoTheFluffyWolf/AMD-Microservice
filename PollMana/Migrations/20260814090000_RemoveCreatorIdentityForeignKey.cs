using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PollMana.Data;

#nullable disable

namespace PollMana.Migrations;

[DbContext(typeof(PollContext))]
[Migration("20260814090000_RemoveCreatorIdentityForeignKey")]
public partial class RemoveCreatorIdentityForeignKey : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Polls_AspNetUsers_CreatorUserID",
            table: "Polls");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddForeignKey(
            name: "FK_Polls_AspNetUsers_CreatorUserID",
            table: "Polls",
            column: "CreatorUserID",
            principalTable: "AspNetUsers",
            principalColumn: "UserID",
            onDelete: ReferentialAction.Cascade);
    }
}
