using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using VoteMana.Data;

#nullable disable

namespace VoteMana.Migrations;

[DbContext(typeof(VoteContext))]
[Migration("20260814090500_UseAnonymousVoterToken")]
public partial class UseAnonymousVoterToken : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Vote_AspNetUsers_UserID",
            table: "Vote");

        migrationBuilder.DropIndex(
            name: "IX_Vote_PollID_UserID",
            table: "Vote");

        migrationBuilder.DropIndex(
            name: "IX_Vote_UserID",
            table: "Vote");

        migrationBuilder.RenameColumn(
            name: "UserID",
            table: "Vote",
            newName: "VoterToken");

        migrationBuilder.AlterColumn<string>(
            name: "VoterToken",
            table: "Vote",
            type: "character varying(128)",
            maxLength: 128,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "text");

        migrationBuilder.CreateIndex(
            name: "IX_Vote_PollID_VoterToken",
            table: "Vote",
            columns: new[] { "PollID", "VoterToken" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Vote_PollID_VoterToken",
            table: "Vote");

        migrationBuilder.AlterColumn<string>(
            name: "VoterToken",
            table: "Vote",
            type: "text",
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(128)",
            oldMaxLength: 128);

        migrationBuilder.RenameColumn(
            name: "VoterToken",
            table: "Vote",
            newName: "UserID");

        migrationBuilder.CreateIndex(
            name: "IX_Vote_PollID_UserID",
            table: "Vote",
            columns: new[] { "PollID", "UserID" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Vote_UserID",
            table: "Vote",
            column: "UserID");

        migrationBuilder.AddForeignKey(
            name: "FK_Vote_AspNetUsers_UserID",
            table: "Vote",
            column: "UserID",
            principalTable: "AspNetUsers",
            principalColumn: "UserID",
            onDelete: ReferentialAction.Cascade);
    }
}
