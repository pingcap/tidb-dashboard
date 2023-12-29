// This scripts is used to create a new release tag for the current release branch
// when we need to submit a PR to PD for updating the tidb-dashboard.
// After this tag is pushed, it will trigger the CI to build a new tidb-dashboard release version.
// Then we can run the manual-create-pd-pr.yaml workflow in the GitHub to create a PR to PD.

const { execSync } = require('child_process');

function getGitBranch() {
  // master, release-7.6
  return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
}

function getGitShortSha() {
  // eb69e4fd
  return execSync('git rev-parse --short HEAD').toString().trim();
}

function getGitLatestTag() {
  // v7.6.0-alpha, v7.6.0-<sha>, v7.6.0, v7.6.1-<sha>, v7.6.1
  return execSync('git describe --tags --dirty --always').toString().trim();
}

function createReleaseTag() {
  const branch = getGitBranch();

  if (!branch.match(/release-\d.\d$/)) {
    console.error('Err: this is not a valid release branch');
    return
  }

  const branchVer = branch.replace('release-', '');
  const latestTag = getGitLatestTag().replace('-fips', '');

  if (!latestTag.startsWith(`v${branchVer}.`)) {
    console.error(`Err: latest tag ${latestTag} doesn't match the branch ${branch}, you need to add the new tag manually`);
    return
  }

  const shortSha = getGitShortSha();
  const splitPos = latestTag.indexOf('-');
  let nextTag = ''
  if (splitPos === -1) {
    // the latest tag likes v7.6.0, v7.6.1
    // then the next tag should be v7.6.1-<sha> for v7.6.0, v7.6.2-<sha> for v7.6.1
    const suffix = latestTag.replace(`v${branchVer}.`, '');
    nextTag = `v${branchVer}.${parseInt(suffix) + 1}-${shortSha}`;
  } else {
    // the latest tag likes v7.6.0-<sha>, v7.6.1-<sha>
    // then the next tag should be v7.6.0-<sha> for v7.6.0-<sha>, v7.6.1-<sha> for v7.6.1-<sha>
    const prefix = latestTag.substring(0, splitPos);
    nextTag = `${prefix}-${shortSha}`;
  }
  execSync(`git tag ${nextTag}`);
  console.log(`Created tag ${nextTag}`)
}

createReleaseTag()
