async function main() {
  console.log(
    "Inventory seeding is disabled. Create an account in the app and enter your own workshop data.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
