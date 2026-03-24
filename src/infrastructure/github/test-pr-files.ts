import { GithubClientService } from "./github-client-service"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "src/app.module"


async function run() {

  const app = await NestFactory.createApplicationContext(AppModule)

  const githubClient = app.get(GithubClientService)

  const octokit = await githubClient.getInstallationOctokit(123456)

  const files = await githubClient.fetchPrFiles(
      octokit,
      "owner",
      "repo",
      1
  )

  console.log(files)

  await app.close()
}

run()