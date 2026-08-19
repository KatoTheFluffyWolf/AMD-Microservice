using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PollMana.Migrations
{
    /// <inheritdoc />
    public partial class RestoreCreatorIdentityForeignKey : Migration
    {
        /// <inheritdoc />
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Polls_AspNetUsers_CreatorUserID",
                table: "Polls");
        }
    }
}
