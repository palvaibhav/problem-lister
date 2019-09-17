const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(bodyParser.urlencoded({ extended: false }));

const problemStatsMap = new Map();

app.use((req, res, next) => {
  const url = 'http://codeforces.com/api/problemset.problems';
  fetch(url)
    .then(result => {
      return result.json();
    })
    .then(problemSet => {
      //console.log(problemSet);
      const problemStats = problemSet.result.problemStatistics;
      problemStats.forEach(p => {
        const problem = { contestId: p.contestId, index: p.index };
        problemStatsMap.set(JSON.stringify(problem), p.solvedCount);
      });
      next();
    })
    .catch(err => console.log(err));
});

app.get('/', (req, res, next) => {
  res.render('index');
  next();
});

const getUserProblems = username => {
  const promise = new Promise(resolve => {
    const url = `http://codeforces.com/api/user.status?handle=${username}&from=1`;
    fetch(url)
      .then(result => {
        return result.json();
      })
      .then(userData => {
        const userSubs = userData.result;
        problems = [];
        userSubs.forEach(sub => {
          const contestId = sub.problem.contestId;
          const index = sub.problem.index;
          const name = sub.problem.name;
          problems.push({ contestId: contestId, index: index, name: name });
        });
        let uniqueProblems = [];
        problems.forEach(p => {
          let found = false;
          for (let i = 0; i < uniqueProblems.length; i++) {
            const q = uniqueProblems[i];
            if (
              (q.contestId === p.contestId && q.index === p.index) ||
              q.name === p.name
            ) {
              found = true;
              break;
            }
          }
          if (!found) {
            uniqueProblems.push(p);
          }
        });
        uniqueProblems = uniqueProblems.map(p => {
          const problem = { contestId: p.contestId, index: p.index };
          const newP = {
            ...p,
            solvedCount: problemStatsMap.get(JSON.stringify(problem)),
            url: `http://codeforces.com/contest/${p.contestId}/problem/${p.index}`
          };
          return newP;
        });
        uniqueProblems.sort((a, b) => {
          return b.solvedCount - a.solvedCount;
        });
        let finalList = [];
        uniqueProblems.forEach(p => {
          if (p.solvedCount > 0) finalList.push(p);
        });
        resolve(finalList);
      })
      .catch(err => {
        console.log(err);
      });
  });
  return promise;
};

app.post('/get-list', (req, res, next) => {
  const userHandle = req.body.userHandle;
  const targetHandle = req.body.targetHandle;
  let userProblems;
  let targetProblems;
  getUserProblems(userHandle)
    .then(result => {
      userProblems = result;
      return getUserProblems(targetHandle);
    })
    .then(result => {
      targetProblems = result.filter(p => {
        let found = false;
        for (let i = 0; i < userProblems.length; i++) {
          const q = userProblems[i];
          if (
            p.contestId === q.contestId &&
            p.index === q.index &&
            p.name === q.name
          ) {
            found = true;
            break;
          }
        }
        return !found;
      });
      res.render('list', { problems: targetProblems });
      next();
    })
    .catch(err => {
      console.log(err);
    });
});

app.listen(3000);
