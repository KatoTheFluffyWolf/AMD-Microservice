using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace VoteMana.Migrations
{
    /// <inheritdoc />
    public partial class VoteInitial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Vote",
                columns: table => new
                {
                    VoteID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PollID = table.Column<long>(type: "bigint", nullable: false),
                    PollOptionID = table.Column<long>(type: "bigint", nullable: false),
                    UserID = table.Column<string>(type: "text", nullable: false),
                    VotedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vote", x => x.VoteID);
                    table.ForeignKey(
                        name: "FK_Vote_AspNetUsers_UserID",
                        column: x => x.UserID,
                        principalTable: "AspNetUsers",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Vote_PollOptions_PollID_PollOptionID",
                        columns: x => new { x.PollID, x.PollOptionID },
                        principalTable: "PollOptions",
                        principalColumns: new[] { "PollID", "OptionID" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Vote_Polls_PollID",
                        column: x => x.PollID,
                        principalTable: "Polls",
                        principalColumn: "PollID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Vote_PollID_PollOptionID",
                table: "Vote",
                columns: new[] { "PollID", "PollOptionID" });

            migrationBuilder.CreateIndex(
                name: "IX_Vote_PollID_UserID",
                table: "Vote",
                columns: new[] { "PollID", "UserID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vote_UserID",
                table: "Vote",
                column: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Vote");
        }
    }
}
