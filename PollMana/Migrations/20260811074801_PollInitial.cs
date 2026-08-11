using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PollMana.Migrations
{
    /// <inheritdoc />
    public partial class PollInitial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Polls",
                columns: table => new
                {
                    PollID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Url = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    CreatorUserID = table.Column<string>(type: "text", nullable: false),
                    Question = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsClosed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Polls", x => x.PollID);
                    table.ForeignKey(
                        name: "FK_Polls_AspNetUsers_CreatorUserID",
                        column: x => x.CreatorUserID,
                        principalTable: "AspNetUsers",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PollOptions",
                columns: table => new
                {
                    OptionID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PollID = table.Column<long>(type: "bigint", nullable: false),
                    OptionIndex = table.Column<short>(type: "smallint", nullable: false),
                    OptionText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PollOptions", x => x.OptionID);
                    table.UniqueConstraint("AK_PollOptions_PollID_OptionID", x => new { x.PollID, x.OptionID });
                    table.CheckConstraint("CHK_PollOptions_OptionIndex", "\"OptionIndex\" BETWEEN 0 AND 5");
                    table.ForeignKey(
                        name: "FK_PollOptions_Polls_PollID",
                        column: x => x.PollID,
                        principalTable: "Polls",
                        principalColumn: "PollID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PollOptions_PollID_OptionIndex",
                table: "PollOptions",
                columns: new[] { "PollID", "OptionIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Polls_CreatorUserID",
                table: "Polls",
                column: "CreatorUserID");

            migrationBuilder.CreateIndex(
                name: "IX_Polls_Url",
                table: "Polls",
                column: "Url",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PollOptions");

            migrationBuilder.DropTable(
                name: "Polls");
        }
    }
}
