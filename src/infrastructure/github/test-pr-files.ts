import { GithubClientService } from "./github-client-service"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "src/app.module"


async function run() {

  const app = await NestFactory.createApplicationContext(AppModule)

  const githubClient = app.get(GithubClientService)

  const octokit = await githubClient.getInstallationOctokit(117705228)

  const files = await githubClient.fetchPrFiles(
      octokit,
      "yasharora2678",
      "preview-intel",
      1
  )
  const filteredFiles = githubClient.filterFiles(files)
  console.log(filteredFiles)

  await app.close()
}

run()