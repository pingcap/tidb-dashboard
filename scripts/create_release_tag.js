// This scripts is used to create a new release tag for the current release branch
// when we need to submit a PR to PD for updating the tidb-dashboard.
// After this tag is pushed, it will trigger the CI to build a new tidb-dashboard release version.
// Then we can run the manual-create-pd-pr.yaml workflow in the GitHub to create a PR to PD.

const { execSync } = require('child_process');

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// rl.on('close', () => {
//   console.log('exit')
//   process.exit(0);
// });

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
  // v7.6.0-alpha-3-g383cf602, v7.6.0-<sha>-3-g383cf602, v7.6.0-3-g383cf602, v7.6.1-<sha>-3-g383cf602, v7.6.1-3-g383cf602
  return execSync('git describe --tags --dirty --always').toString().trim();
}

function question(nextTag) {
  rl.question(`Do you want to create tag ${nextTag}? (y or enter continue, others exit): `, (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === '') {
      execSync(`git tag ${nextTag}`);
      console.log(`Created tag ${nextTag}`)
      process.exit(0);
    } else {
      console.log('Cancel create tag')
      process.exit(0);
    }
  })
}

function createReleaseTag() {
  const branch = getGitBranch();
  const branchVer = branch.replace('release-', '');
  const latestTag = getGitLatestTag().replace('-fips', '');

  if (!latestTag.startsWith(`v${branchVer}.`)) {
    console.error(`Err: latest tag ${latestTag} doesn't match the branch ${branch}, you need to add the new tag manually`);
    process.exit(1)
  }

  const shortSha = getGitShortSha();
  const splitPos = latestTag.indexOf('-');
  let nextTag = ''
  if (splitPos === -1) {
    // the latest tag likes v7.6.0, v7.6.1
    // then the next tag should be v7.6.1-<sha> for v7.6.0, v7.6.2-<sha> for v7.6.1
    const suffix = latestTag.replace(`v${branchVer}.`, '');
    nextTag = `v${branchVer}.${parseInt(suffix) + 1}-${shortSha}`;
  } else if (latestTag.match(/^v\d+\.\d+\.\d+-\d+-[0-9a-z]{9}/)) {
    // the latest tag likes v7.6.0-3-g383cf602, v7.6.1-3-g383cf602
    // then the next tag should be v7.6.1-<sha> for v7.6.0, v7.6.2-<sha> for v7.6.1
    const suffix = latestTag.substring(0, splitPos).replace(`v${branchVer}.`, '');
    nextTag = `v${branchVer}.${parseInt(suffix) + 1}-${shortSha}`;
  } else {
    // the latest tag likes v7.6.0-<sha>, v7.6.1-<sha>
    // then the next tag should be v7.6.0-<sha> for v7.6.0-<sha>, v7.6.1-<sha> for v7.6.1-<sha>
    const prefix = latestTag.substring(0, splitPos);
    nextTag = `${prefix}-${shortSha}`;
  }

  question(nextTag)
}

function createMasterTag() {
  const latestTag = getGitLatestTag();
  // the latest tag must like vX.Y.0-alpha-3-g383cf602, likes `v8.4.0-alpha-3-g383cf602`
  // or like vX.Y.0-<sha>-3-g383cf602
  const shortSha = getGitShortSha();
  if (!latestTag.match(/^v\d+\.\d+.0-alpha/) && !latestTag.match(/^v\d+\.\d+.0-[0-9a-z]{8}/)) {
    console.error(`Err: latest tag ${latestTag} is not a valid tag, please add the tag manually, currently sha is ${shortSha}, the tag should be vX.Y.Z-${shortSha}`)
    process.exit(1)
  }
  const splitPos = latestTag.indexOf('-');
  const prefix = latestTag.substring(0, splitPos);
  const nextTag = `${prefix}-${shortSha}`

  question(nextTag)
}

function createTag() {
  const branch = getGitBranch();

  if (branch.match(/^release-\d+\.\d+$/)) {
    createReleaseTag()
  } else if (branch === 'master') {
    createMasterTag()
  } else {
    console.error('Err: this is not a valid branch that can be tagged');
    process.exit(1)
  }
}

createTag()
