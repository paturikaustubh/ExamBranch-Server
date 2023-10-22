const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const fastcsv = require("fast-csv");
const fs = require("fs");
const csvtojson = require("csvtojson");
const multer = require("multer");
app.use(express.json());
app.use(cors());
const md5 = require("md5-nodejs");
const dayjs = require("dayjs");

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "root",
  database: "practice",
  multipleStatements: true,
});

let downLoc = "..\\Downloads\\";

//LOG!!
var messageIp = (mess, ip) => {
  var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
  db.query(`select userName from userip where ip="${ip}"`, (_err, result) => {
    if (result) {
      fs.appendFile(
        "log.txt",
        "\n[" + dt + ']\t"' + result[0]["userName"] + '" ' + mess + ip,
        function (_er) {}
      );
    }
  });
};

var messtrunk = (ip, name) => {
  var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
  db.query(`select userName from userip where ip="${ip}"`, (_err, result) => {
    if (result) {
      fs.appendFile(
        "log.txt",
        "\n[" +
          dt +
          ']\t"' +
          result[0]["userName"] +
          '" truncated ' +
          name +
          " from " +
          ip,
        function (_er) {}
      );
    }
  });
};

var message = (rollNo, mess, ip) => {
  var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
  try {
    db.query(`select userName from userip where ip="${ip}"`, (_err, result) => {
      if (result) {
        fs.appendFile(
          "log.txt",
          "\n[" +
            dt +
            ']\t"' +
            result[0]["userName"] +
            '" ' +
            mess +
            rollNo +
            " from " +
            ip,
          function (_er) {}
        );
      }
    });
  } catch (err) {}
};

var upMessage = (fname, ip, type) => {
  var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
  try {
    db.query(`select userName from userip where ip="${ip}"`, (_err, result) => {
      if (result) {
        fs.appendFile(
          "log.txt",
          "\n[" +
            dt +
            ']\t"' +
            result[0]["userName"] +
            '" uploaded  ' +
            type +
            fname +
            " from " +
            ip,
          function (_er) {}
        );
      }
    });
  } catch (err) {}
};

var downMessage = (table, ip) => {
  var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
  try {
    db.query(`select userName from userip where ip="${ip}"`, (_err, result) => {
      if (result) {
        fs.appendFile(
          "log.txt",
          "\n[" +
            dt +
            ']\t"' +
            result[0]["userName"] +
            '" downloaded ' +
            table +
            " from " +
            ip,
          function (_er) {}
        );
      }
    });
  } catch (err) {}
};

///Regularr
app.post("/Storeregular", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(500).json(err);
    }
    fname = req.file.originalname;
    return res.status(200).send(req.file);
  });
});

app.post("/DownBack", (req, res) => {
  const ws = fs.createWriteStream(`${downLoc}\\backup.csv`);
  db.query(`select * from studentinfo`, (err, result) => {
    let data = JSON.parse(JSON.stringify(result));

    fastcsv
      .write(data, { headers: true })
      .on("finish", () => {})
      .pipe(ws)
      .on("close", () => {
        res.download(`${downLoc}\\backup.csv`, "backup.csv");
      });
    messageIp("Made backup from", req.ip.slice(7));
    if (err) {
      res.send({ del: false });
    }
  });
});

app.post("/UpBack", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let count = 0;
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("Error lol", err);
    } else {
      files.forEach((fname) => {
        if (fname === "backup.csv") {
          csvtojson()
            .fromFile(`${loc}\\${fname}`)
            .then((s) => {
              let rno = Object.keys(s[0])[0]; //rollNo
              let code = Object.keys(s[0])[1]; //subCode
              let sname = Object.keys(s[0])[2]; //subName
              let grade = Object.keys(s[0])[3]; //GRADE
              let acyr = Object.keys(s[0])[4]; //acYear
              let sem = Object.keys(s[0])[5]; //SEM
              let exyr = Object.keys(s[0])[6]; //EXYEAR
              let exmo = Object.keys(s[0])[7]; //EXMONTH

              s.forEach((e) => {
                db.query(
                  `insert ignore into studentinfo (rollNo, subCode, subName, grade, acYear, sem, exYear, exMonth) values ("${e[rno]}", "${e[code]}", "${e[sname]}", "${e[grade]}", ${e[acyr]}, ${e[sem]}, ${e[exyr]}, ${e[exmo]})`,
                  (err, _result) => {
                    try {
                      count++;
                      console.clear();
                      console.log(
                        `Restored ${count}/${s.length} records\n${parseInt(
                          (count / s.length) * 100
                        )}%`
                      );
                      if (count === s.length) {
                        messageIp("restored detabase from ", ip);
                        console.log("Restore done.");
                        res.send({ done: true });
                      }
                      if (err) {
                        res.send({ err: true });
                      }
                    } catch (e) {
                      console.log(e);
                    }
                  }
                );
              });
              // }
            });
        }
      });
    }
  });
});

app.post("/UpdateRegular", (req, res) => {
  const acYear = req.body.acYear;
  const sem = req.body.sem;
  const exYear = req.body.exYear;
  const exMonth = req.body.exMonth;
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let filesRead = 0;
  let totalFiles = 0;
  let erfile = [];
  let flag = false;
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("error" + err);
      res.send({ err: true });
    } else {
      totalFiles = files.length;
      console.log("Files found " + totalFiles);
    }
  });
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err);
    } else {
      console.clear();
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let subCode = Object.keys(s[0])[1].split("-")[0];
            let subName = Object.keys(s[0])[1].split("-")[1];
            let grade = Object.keys(s[0])[1];
            let count = 0;
            console.log("Uploading ", fname);
            db.query(
              `SELECT * FROM codenames where subCode = "${subCode}" and subName = "${subName}"`,
              (err, result) => {
                if (err) {
                  console.log(err);
                } else if (result.length > 0) {
                  s.forEach((e) => {
                    if (
                      typeof subName === "string" &&
                      typeof subCode === "string" &&
                      Object.keys(s[0])[0] === "rollNo"
                    ) {
                      if (e[grade] === "Ab") {
                        e[grade] = "F";
                      }

                      db.query(
                        `insert ignore into studentinfo(rollNo,subCode,subName,grade,acYear,sem,exYear,exMonth) values("${e["rollNo"]}","${subCode}","${subName}","${e[grade]}",${acYear},${sem},${exYear},${exMonth});`,
                        (err, _result) => {
                          try {
                            count++;
                            if (count === s.length) {
                              filesRead++;
                              upMessage(fname, ip, "regular ");
                              if (filesRead === totalFiles) {
                                console.log("Error files", erfile);
                                db.query(
                                  `update studentinfo stu inner join grades g on stu.grade=g.grade set stu.gradePoint=g.gradePoint;`,
                                  (err, result) => {
                                    if (err) {
                                      console.log(err);
                                    } else if (result) {
                                      console.log(result);
                                    }
                                  }
                                );
                                db.query(
                                  `update studentinfo stu inner join subcred g on stu.subCode=g.subCode set stu.credits=stu.gradePoint*g.credits;`,
                                  (err, result) => {
                                    if (err) {
                                      console.log(err);
                                    } else if (result) {
                                      console.log(result);
                                    }
                                  }
                                );
                                res.send({ done: true });
                              }
                            }
                            if (err) {
                              console.log(err, "Errorrrrrr!!!!");
                              erfile.push(fname);
                            }
                          } catch (e) {
                            console.log(e);
                          }
                        }
                      );
                    } else {
                      flag = true;
                      count++;
                      if (count === s.length) {
                        filesRead++;
                        console.log(filesRead, "File format error ", fname);
                        if (filesRead === totalFiles) {
                          console.log("Error files", erfile);
                          res.send({
                            done: true,
                            tot: filesRead,
                            ertot: erfile.length,
                            erf: erfile,
                          });
                        }
                      }
                    }
                  });
                } else {
                  erfile.push(fname);
                  res.send({ ertot: erfile.length, erf: erfile });
                }
              }
            );
            if (flag) {
              erfile.push(fname);
              flag = false;
            }
          });
      });
    }
    // upMessage(fname, ip, " regular ")
  });
});

///////supply||Reval
app.post("/Storesupply", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(500).json(err);
    }
    fname = req.file.originalname;
    return res.status(200).send(req.file);
  });
});

app.post("/UpdateSupply", (req, res) => {
  // console.log(req.body)
  const acYear = req.body.acYear;
  const sem = req.body.sem;
  const exYear = req.body.exYear;
  const exMonth = req.body.exMonth;
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let filesRead = 0;
  let totalFiles = 0;
  let flag = false;
  let erfiles = [];
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true });
      console.log("error" + err);
    } else {
      totalFiles = files.length;
      console.log("Supply files found " + totalFiles);
    }
  });
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err);
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            // console.log(Object.keys(s[1], "SSS"))
            let subCode = Object.keys(s[0])[1].split("-")[0];
            let subName = Object.keys(s[0])[1].split("-")[1];
            let grade = Object.keys(s[0])[1];
            let count = 0;
            s.forEach((e) => {
              console.log(subCode, subName, e["rollNo"], e[grade]);
              if (typeof subCode === "string" && typeof subName === "string") {
                console.log("Inside if");
                if (e[grade] !== "") {
                  db.query(
                    `replace into studentinfo (rollNo, grade, exYear, exMonth, subCode, subName, acYear, sem) values("${e["rollNo"]}","${e[grade]}",${exYear}, ${exMonth},"${subCode}","${subName}",${acYear},${sem});`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!");
                          erfiles.push(fname);
                        }
                        count++;
                        if (count === s.length) {
                          filesRead++;
                          upMessage(fname, ip, "supplementary ");
                          console.log(filesRead, " uploaded", fname);
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles);
                            db.query(
                              `update studentinfo stu inner join grades g on stu.grade=g.grade set stu.gradePoint=g.gradePoint;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err);
                                } else if (result) {
                                  console.log(result);
                                }
                              }
                            );
                            db.query(
                              `update studentinfo stu inner join subcred g on stu.subCode=g.subCode set stu.credits=stu.gradePoint*g.credits;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err);
                                } else if (result) {
                                  console.log(result);
                                }
                              }
                            );
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            });
                          }
                        }
                      } catch (e) {
                        console.log(e);
                      }
                    }
                  );
                } else {
                  count++;
                }
              } else {
                flag = true;
              }
            });
          });
      });
      if (flag) {
        erfiles.push(fname);
        flag = false;
      }
    }
  });
});

//  UPLOAD PAID SUPPLY
app.post("/UpdatePaidSupple", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let filesRead = 0;
  let totalFiles = 0;
  let flag = false;
  let erfiles = [];
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      // console.log("error" + err)
      res.send({ err: true });
    } else {
      totalFiles = files.length;
      console.log(`${totalFiles} found!`);
    }
  });

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err);
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let rollNo = Object.keys(s[0])[0];
            let subCode = Object.keys(s[0])[1];
            let subName = Object.keys(s[0])[2];
            let year = Object.keys(s[0])[3];
            let sem = Object.keys(s[0])[4];
            let regDate = Object.keys(s[0])[5];
            let user = Object.keys(s[0])[6];
            let count = 0;
            s.forEach((e) => {
              console.log(e);
              if (typeof subCode === "string" && typeof subName === "string") {
                if (true) {
                  db.query(
                    `insert ignore into paidsupply (rollNo, subCode, subName, acYear, sem, regDate, user) values("${e[rollNo]}", "${e[subCode]}", "${e[subName]}", ${e[year]}, ${e[sem]}, "${e[regDate]}", "${e[user]}");`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!");
                          erfiles.push(fname);
                        }
                        count++;
                        console.clear();
                        console.log(`${count}/${s.length} rows uploaded!`);
                        if (count === s.length) {
                          filesRead++;
                          upMessage(fname, ip, "Paid Supply ");
                          console.clear();
                          console.log(filesRead, " uploaded", fname);
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles);
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            });
                          }
                        }
                      } catch (e) {
                        console.log(e);
                      }
                    }
                  );
                } else {
                  count++;
                }
              } else {
                flag = true;
              }
            });
          });
      });
      if (flag) {
        erfiles.push(fname);
        flag = false;
      }
    }
  });
  // console.log("Error files", erfiles)
});
//  UPLOAD PAID REVAL
app.post("/UpdatePaidReval", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let filesRead = 0;
  let totalFiles = 0;
  let flag = false;
  let erfiles = [];
  var ip = req.ip.slice(7);

  console.log(ip);

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true });
      console.log("error" + err);
    } else {
      totalFiles = files.length;
      console.log("Reval files found " + totalFiles);
    }
  });
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err);
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let rollNo = Object.keys(s[0])[0];
            let subCode = Object.keys(s[0])[1];
            let subName = Object.keys(s[0])[2];
            let year = Object.keys(s[0])[3];
            let sem = Object.keys(s[0])[4];
            let regDate = Object.keys(s[0])[5];
            let stat = Object.keys(s[0])[6];
            let user = Object.keys(s[0])[7];

            let count = 0;
            s.forEach((e) => {
              if (typeof subCode === "string" && typeof subName === "string") {
                if (true) {
                  db.query(
                    `insert ignore into paidreevaluation (rollNo, subCode, subName, acYear, sem, regDate, stat, user) values("${e[rollNo]}","${e[subCode]}","${e[subName]}", ${e[year]},${e[sem]},"${e[regDate]}", "${e[stat]}", "${e[user]}");`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!");
                          erfiles.push(fname);
                        }
                        count++;
                        console.log(`${count}/${s.length} rows uploaded!`);
                        if (count === s.length) {
                          filesRead++;
                          upMessage(fname, ip, "Paid Reval ");
                          console.log(filesRead, " uploaded", fname);
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles);
                            console.log(erfiles.length);
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            });
                          }
                        }
                      } catch (e) {
                        console.log(e);
                      }
                    }
                  );
                } else {
                  count++;
                }
              } else {
                flag = true;
              }
            });
          });
      });
      if (flag) {
        erfiles.push(fname);
        flag = false;
      }
    }
  });
  // console.log("Error files", erfiles)
});

//  UPLOAD PAID CBT
app.post("/UpdatePaidCbt", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let filesRead = 0;
  let totalFiles = 0;
  let flag = false;
  let erfiles = [];
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true });
      console.log("error" + err);
    } else {
      totalFiles = files.length;
      console.log("CBT files found " + totalFiles);
    }
  });
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err);
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let rollNo = Object.keys(s[0])[0];
            let subCode = Object.keys(s[0])[1];
            let subName = Object.keys(s[0])[2];
            let year = Object.keys(s[0])[3];
            let sem = Object.keys(s[0])[4];
            let branch = Object.keys(s[0])[5];
            let regDate = Object.keys(s[0])[6];
            let user = Object.keys(s[0])[7];
            let count = 0;
            s.forEach((e) => {
              // console.log(subCode, subName, e["rollNo"], e[grade])
              if (typeof subCode === "string" && typeof subName === "string") {
                if (true) {
                  db.query(
                    `insert ignore into paidcbt (rollNo, subCode, subName, acYear, sem, regDate, branch, user) values("${e[rollNo]}","${e[subCode]}","${e[subName]}", ${e[year]},${e[sem]},"${e[regDate]}", "${e[branch]}", "${e[user]}");`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!");
                          erfiles.push(fname);
                        }
                        count++;
                        console.log(`${count}/${s.length} rows uploaded!`);
                        if (count === s.length) {
                          filesRead++;
                          upMessage(fname, ip, "Paid CBT ");
                          console.log(filesRead, " uploaded", fname);
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles);
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            });
                          }
                        }
                      } catch (e) {
                        console.log(e);
                      }
                    }
                  );
                } else {
                  count++;
                }
              } else {
                flag = true;
              }
            });
          });
      });
      if (flag) {
        erfiles.push(fname);
        flag = false;
      }
    }
  });
  // console.log("Error files", erfiles)
});

//////////////////////////////////////////

app.post("/printSupply", (req, res) => {
  const rno = req.body.rno;
  const A = req.body.A;
  const B = req.body.B;
  const C = req.body.C;
  const D = req.body.D;
  const E = req.body.E;
  const F = req.body.F;
  const G = req.body.G;
  const H = req.body.H;
  const ip = req.ip.slice(7);

  A.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",1,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                console.log(err);
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });
  B.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",1,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  C.forEach((element) => {
    console.log(element);
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",2,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                console.log(err);
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  D.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",2,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  E.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",3,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  F.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",3,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  G.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",4,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  H.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",4,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });
  message(rno, "took print for supple for ", ip);
  res.send({ done: true });
});

////supplyy

app.post("/Registersupply", (req, res) => {
  const rno = req.body.rno;
  const A = req.body.A;
  const B = req.body.B;
  const C = req.body.C;
  const D = req.body.D;
  const E = req.body.E;
  const F = req.body.F;
  const G = req.body.G;
  const H = req.body.H;
  var ip = req.ip.slice(7);

  A.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",1,1, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  B.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",1,2, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  C.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",2,1, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  D.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",2,2, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  E.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",3,1, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  F.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",3,2, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  G.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",4,1, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  H.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into paidsupply(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",4,2, curdate(), (select userName from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });
  message(rno, "has registered Supply for ", ip);
  db.query(`delete from printsupply where rollNo = '${rno}';`);
  res.send({ registered: true });
});

app.post("/Supplysearch", (req, res) => {
  const rno = req.body.rno;
  const gr = req.body.gr;
  let ans = [];
  let subNames = [];
  let subCodes = [];
  let mapper = {};
  let value = 0;

  db.query(
    `select subName from printsupply where rollNo = '${rno}';`,
    (_err, result) => {
      if (result.length > 0) {
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 1 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ A: tempSubs });
              subCodes.push({ A: tempCodes });
              ans.push({ A: result });
              value = value + result.length;
            }
          }
        );
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 1 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ B: tempSubs });
              subCodes.push({ B: tempCodes });

              ans.push({ B: result });
              value = value + result.length;
            }
          }
        );
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 2 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ C: tempSubs });
              subCodes.push({ C: tempCodes });

              ans.push({ C: result });
              value = value + result.length;
            }
          }
        );
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 2 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ D: tempSubs });
              subCodes.push({ D: tempCodes });

              ans.push({ D: result });
              value = value + result.length;
            }
          }
        );
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 3 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ E: tempSubs });
              subCodes.push({ E: tempCodes });

              ans.push({ E: result });
              value = value + result.length;
            }
          }
        );
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 3 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ F: tempSubs });
              subCodes.push({ F: tempCodes });
              ans.push({ F: result });
              value = value + result.length;
            }
          }
        );
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 4 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ G: tempSubs });
              subCodes.push({ G: tempCodes });

              ans.push({ G: result });
              value = value + result.length;
            }
          }
        );
        db.query(
          `select subCode, subName from printsupply where rollNo ='${rno}' and acYear = 4 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else if (result.length > 0) {
              let tempSubs = [];
              let tempCodes = [];
              result.forEach((e) => {
                tempSubs.push(e.subName);
                tempCodes.push(e.subCode);
                mapper[e.subCode] = e.subName;
              });
              subNames.push({ H: tempSubs });
              subCodes.push({ H: tempCodes });

              ans.push({ H: result });
              value = value + result.length;
            }
            ans.push({ printTab: true });
            ans.unshift({ I: value });
            res.send({
              subNames,
              subCodes,
              mapper,
              printTab: true,
              value,
              ans,
            });
          }
        );
      } else {
        //1 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=1 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ A: tempSubs });
                  subCodes.push({ A: tempCodes });
                  ans.push({ A: result });
                  value = value + result.length;
                }
              }
            }
          }
        );

        //1 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=1 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ B: tempSubs });
                  subCodes.push({ B: tempCodes });
                  ans.push({ B: result });
                  value = value + result.length;
                }
                // console.log(ans, "1:2")
              }
            }
          }
        );

        //2 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=2 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ C: tempSubs });
                  subCodes.push({ C: tempCodes });
                  ans.push({ C: result });
                  value = value + result.length;
                }
              }
            }
          }
        );

        //2 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=2 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ D: tempSubs });
                  subCodes.push({ D: tempCodes });
                  ans.push({ D: result });
                  value = value + result.length;
                }
              }
            }
          }
        );

        //3 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=3 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ E: tempSubs });
                  subCodes.push({ E: tempCodes });
                  ans.push({ E: result });
                  value = value + result.length;
                }
              }
            }
          }
        );

        //3 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=3 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ F: tempSubs });
                  subCodes.push({ F: tempCodes });
                  ans.push({ F: result });
                  value = value + result.length;
                }
              }
            }
          }
        );

        //4 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=4 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ G: tempSubs });
                  subCodes.push({ G: tempCodes });
                  ans.push({ G: result });
                  value = value + result.length;
                }
              }
            }
          }
        );

        //4 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidsupply p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.grade ="${gr}" and t.acYear=4 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err });
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ H: tempSubs });
                  subCodes.push({ H: tempCodes });
                  ans.push({ H: result });
                  value = value + result.length;
                }
                ans.push({ printTab: false });
                // console.log(subCodes, subNames, mapper)
                res.send({
                  subNames,
                  subCodes,
                  mapper,
                  printTab: false,
                  value,
                  ans,
                });
              }
            }
          }
        );
      }
    }
  );
});

////// reval starts here

app.post("/Revalsearch", (req, res) => {
  const rno = req.body.rno;
  const exMonth = req.body.exMonth;
  const exYear = req.body.exYear;
  let subNames = [];
  let subCodes = [];
  let mapper = {};
  let availableSems = [];
  let value = 0;

  db.query(
    `select subName from printreval where rollNo = '${rno}';`,
    (_err, result) => {
      if (result.length > 0) {
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 1 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ A: tempSubs });
                  subCodes.push({ A: tempCodes });
                  value = value + result.length;
                  availableSems.push({ code: "A", sem: "1-1" });
                }
              }
            }
          }
        );
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 1 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ B: tempSubs });
                  subCodes.push({ B: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "B",
                    sem: "1-2",
                  });
                }
              }
            }
          }
        );
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 2 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ C: tempSubs });
                  subCodes.push({ C: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "C",
                    sem: "-1",
                  });
                }
              }
            }
          }
        );
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 2 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ D: tempSubs });
                  subCodes.push({ D: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "D",
                    sem: "2-2",
                  });
                }
              }
            }
          }
        );
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 3 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ E: tempSubs });
                  subCodes.push({ E: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "E",
                    sem: "3-1",
                  });
                }
              }
            }
          }
        );
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 3 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ F: tempSubs });
                  subCodes.push({ F: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "F",
                    sem: "3-2",
                  });
                }
              }
            }
          }
        );
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 4 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ G: tempSubs });
                  subCodes.push({ G: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "G",
                    sem: "4-1",
                  });
                }
              }
            }
          }
        );
        db.query(
          `select subCode, subName from printreval where rollNo ='${rno}' and acYear = 4 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ H: tempSubs });
                  subCodes.push({ H: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "H",
                    sem: "4-2",
                  });
                }
                res.send({
                  subNames,
                  subCodes,
                  mapper,
                  printTab: true,
                  value: value,
                  availableSems,
                });
              }
            }
          }
        );
      } else {
        //1 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=1 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ A: tempSubs });
                  subCodes.push({ A: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "A",
                    sem: "1-1",
                  });
                }
              }
            }
          }
        );

        //1 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=1 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ B: tempSubs });
                  subCodes.push({ B: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "B",
                    sem: "1-2",
                  });
                }
              }
            }
          }
        );

        //2 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=2 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ C: tempSubs });
                  subCodes.push({ C: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "C",
                    sem: "2-1",
                  });
                }
              }
            }
          }
        );

        //2 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=2 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ D: tempSubs });
                  subCodes.push({ D: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "D",
                    sem: "2-2",
                  });
                }
              }
            }
          }
        );

        //3 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=3 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ E: tempSubs });
                  subCodes.push({ E: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "E",
                    sem: "3-1",
                  });
                }
              }
            }
          }
        );

        //3 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=3 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ F: tempSubs });
                  subCodes.push({ F: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "F",
                    sem: "3-2",
                  });
                }
              }
            }
          }
        );

        //4 sem 1
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=4 and t.sem=1 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ G: tempSubs });
                  subCodes.push({ G: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "G",
                    sem: "4-1",
                  });
                }
              }
            }
          }
        );

        //4 sem 2
        db.query(
          `select t.subCode,t.subName from studentinfo t LEFT JOIN paidreevaluation p ON t.subCode=p.subCode and t.rollNo=p.rollNo where t.rollNo="${rno}" and t.exMonth=${exMonth} and t.exYear=${exYear} and t.acYear=4 and t.sem=2 and p.subCode is null and p.rollNo is null`,
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = [];
                  let tempCodes = [];
                  result.forEach((e) => {
                    tempSubs.push(e.subName);
                    tempCodes.push(e.subCode);
                    mapper[e.subCode] = e.subName;
                  });
                  subNames.push({ H: tempSubs });
                  subCodes.push({ H: tempCodes });
                  value = value + result.length;
                  availableSems.push({
                    code: "H",
                    sem: "4-2",
                  });
                }
                res.send({
                  subNames,
                  subCodes,
                  mapper,
                  printTab: false,
                  value: value,
                  availableSems,
                });
              }
            }
          }
        );
      }
    }
  );
});

////////reval register
app.post("/Registerreval", (req, res) => {
  const rno = req.body.rno;
  const A = req.body.A;
  const B = req.body.B;
  const C = req.body.C;
  const D = req.body.D;
  const E = req.body.E;
  const F = req.body.F;
  const G = req.body.G;
  const H = req.body.H;
  const k = req.body.k;
  var ip = req.ip.slice(7);
  A.forEach((element) => {
    let reg = "";
    if (k === "A") {
      reg = "R";
    } else {
      reg = "";
    }
    var subName = "";
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",1,1, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });

  B.forEach((element) => {
    var subName = "";
    let reg = "";
    if (k === "B") {
      reg = "R";
    } else {
      reg = "";
    }
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",1,2, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });

  C.forEach((element) => {
    var subName = "";
    let reg = "";
    if (k === "C") {
      reg = "R";
    } else {
      reg = "";
    }
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",2,1, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });

  D.forEach((element) => {
    var subName = "";
    let reg = "";
    if (k === "D") {
      reg = "R";
    } else {
      reg = "";
    }
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",2,2, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });

  E.forEach((element) => {
    var subName = "";
    let reg = "";
    if (k === "E") {
      reg = "R";
    } else {
      reg = "";
    }
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",3,1, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });

  F.forEach((element) => {
    var subName = "";
    let reg = "";
    if (k === "F") {
      reg = "R";
    } else {
      reg = "";
    }
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",3,2, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });

  G.forEach((element) => {
    var subName = "";
    let reg = "";
    if (k === "G") {
      reg = "R";
    } else {
      reg = "";
    }
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",4,1, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });
  H.forEach((element) => {
    var subName = "";
    let reg = "";
    if (k === "H") {
      reg = "R";
    } else {
      reg = "";
    }
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (_err, result) => {
        subName = result[0]["subName"];
        // console.log(subName)

        db.query(
          `insert ignore into paidreevaluation(rollNo,subCode,acYear,sem, regDate, subName, stat, user) values("${rno}","${element}",4,2, curdate(), "${subName}","${reg}", (select userName from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err });
            }
          }
        );
      }
    );
  });
  message(rno, " has Reval Registered ${year} - ${sem} for ", ip);
  db.query(`delete from printreval where rollNo = '${rno}';`);
  res.send({ registered: true });
});
///////

////  PRINT REVAL
app.post("/printReval", (req, res) => {
  const rno = req.body.rno;
  const A = req.body.A;
  const B = req.body.B;
  const C = req.body.C;
  const D = req.body.D;
  const E = req.body.E;
  const F = req.body.F;
  const G = req.body.G;
  const H = req.body.H;
  const ip = req.ip.slice(7);

  A.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",1,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                console.log(err);
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });
  B.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",1,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  C.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",2,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  D.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",2,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  E.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",3,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  F.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",3,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  G.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",4,1, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });

  H.forEach((element) => {
    db.query(
      `select distinct studentinfo.subName from studentinfo where studentinfo.subCode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        if (result) {
          let subName = result[0]["subName"];
          db.query(
            `insert ignore into printreval(rollNo,subCode,subName,acYear,sem, regDate, user) values("${rno}","${element}","${subName}",4,2, curdate(), (select userName from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err });
              }
            }
          );
        }
      }
    );
  });
  message(rno, "took print for reval for ", ip);
  res.send({ done: true });
});

//////LOGIN BOII

app.post("/Login", (req, res) => {
  const userName = req.body.userName;
  const password = req.body.password;
  var ip = req.ip.slice(7);
  db.query(
    `select userName,password from users where binary userName="${userName}"`,
    (err, result) => {
      if (err) {
        res.send({ err: err });
        console.log(err);
      } else {
        if (result.length === 1) {
          const hash = md5(password);
          if (hash === result[0]["password"]) {
            db.query(`replace into userip values ("${userName}", "${ip}");`);
            messageIp(" has logged in from ", ip);
            res.send({ goahead: true, userName: userName });
          } else {
            res.send({ goahead: false });
          }
        } else {
          res.send({ goahead: false });
        }
      }
    }
  );
});

app.post(`/deleteprintreval`, (req, res) => {
  const ip = req.ip.slice(7);
  db.query(
    `delete from printreval where rollNo = "${req.body.rollNo}";`,
    (_err, result) => {
      if (result) {
        message(req.body.rollNo, "deleted details from print reval for", ip);
        res.send({ done: true });
      }
    }
  );
});

//////////

///////DOWNLOAD SUPPLY
app.post("/DownloadSupply", (req, res) => {
  const year = parseInt(req.query.year);
  const sem = parseInt(req.query.sem);
  var ip = req.ip.slice(7);

  // console.log(year, sem, typeof year, typeof sem)

  const ws = fs.createWriteStream(`${downLoc}\\Supple Registered.csv`);

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject Name", acYear as Year, sem as Semester, regDate as "Registered Dt", user as 'Registrant' from paidsupply where acYear=${year} and sem=${sem} order by rollNo , acYear, sem, subCode`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
          console.log(err);
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("supply", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Supple Registered.csv`,
                "Supple Registered.csv"
              );
            });
        } else res.send();
      }
    );
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject Name", acYear as Year, sem as Semester, regDate as "Registered Dt", user as 'Registrant' from paidsupply order by rollNo, acYear, sem, subCode`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
          console.log(err);
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          // console.log(data)
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("supply", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Supple Registered.csv`,
                "Supple Registered.csv"
              );
            });
        } else res.send();
      }
    );
  }
});

app.post("/DownloadSupplyPrint", (req, res) => {
  const year = parseInt(req.query.year);
  const sem = parseInt(req.query.sem);
  var ip = req.ip.slice(7);
  try {
    const ws = fs.createWriteStream(`${downLoc}\\Supple Un-Registered.csv`);

    if (year !== 0 && sem !== 0) {
      db.query(
        `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", regDate as "Registration Dt", user as Registrant from printsupply where acYear=${year} and sem=${sem} order by rollNo, subCode`,
        (err, result) => {
          if (err) {
            res.send({ err: err });
          }
          let data = JSON.parse(JSON.stringify(result));
          if (data.length > 0) {
            fastcsv
              .write(data, { headers: true })
              .on("finish", () => {
                downMessage("Supple Un-Registered", ip);
              })
              .pipe(ws)
              .on("close", () => {
                res.download(
                  `${downLoc}\\Supple Un-Registered.csv`,
                  "Supple Un-Registered.csv"
                );
              });
          } else res.send();
        }
      );
    } else if (year === 0 && sem === 0) {
      db.query(
        `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", regDate as "Registration Dt" from printsupply order by rollNo, acYear, sem, subCode;`,
        (err, result) => {
          if (err) {
            res.send({ err: err });
          }
          let data = JSON.parse(JSON.stringify(result));
          if (data.length > 0) {
            fastcsv
              .write(data, { headers: true })
              .on("finish", () => {
                downMessage("Supplementary Un-Registered", ip);
              })
              .pipe(ws)
              .on("close", () => {
                res.download(
                  `${downLoc}\\Supple Un-Registered.csv`,
                  "Supple Un-Registered.csv"
                );
              });
          } else res.send();
        }
      );
    } else if (year !== 0 && sem == 0) {
      db.query(
        `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", regDate as "Registration Dt", user as Registrant from printsupply where acYear=${year} order by rollNo, subCode`,
        (err, result) => {
          if (err) {
            res.send({ err: err });
          }
          let data = JSON.parse(JSON.stringify(result));
          if (data.length > 0) {
            fastcsv
              .write(data, { headers: true })
              .on("finish", () => {
                downMessage("Supplementary Un-Registered", ip);
              })
              .pipe(ws)
              .on("close", () => {
                res.download(
                  `${downLoc}\\Supple Un-Registered.csv`,
                  "Supple Un-Registered.csv"
                );
              });
          } else res.send();
        }
      );
    }
  } catch (e) {
    console.log(e);
  }
});

//Delete User
app.post("/DelUser", (req, res) => {
  const userName = req.body.userName;
  var ip = req.ip.slice(7);
  // console.log(userName)
  db.query(
    `delete from users where userName="${userName}";`,
    (err, _result) => {
      if (err) {
        // res.send({ err: err })
        console.log(err, "Error");
        res.send({ done: false });
      } else {
        var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
        db.query(`select userName from userip where ip="${ip}"`, (_err, re) => {
          if (re) {
            fs.appendFile(
              "log.txt",
              "\n[" +
                dt +
                ']\t"' +
                re[0]["userName"] +
                '" deleted user "' +
                userName +
                `" from ` +
                ip,
              function (_er) {}
            );
          }
        });
        res.send({ done: true });
      }
    }
  );
});

////Download supply report

app.post("/DownloadSupplyRep", (req, res) => {
  var ip = req.ip.slice(7);
  // //console.log(year, sem)
  const ws = fs.createWriteStream(`${downLoc}\\Supple Report.csv`);
  db.query(
    `select subCode as Code, subName as Subject,count(*) as Total from paidsupply p group by subCode,subName order by count(*) desc, subCode`,
    (err, result) => {
      if (err) {
        res.send({ err: err });
      }
      let data = JSON.parse(JSON.stringify(result));
      if (data.length > 0) {
        fastcsv
          .write(data, { headers: true })
          .on("finish", () => {
            downMessage("supply report", ip);
          })
          .pipe(ws)
          .on("close", () => {
            res.download(
              `${downLoc}\\Supple Report.csv`,
              "Supple Report.csv",
              () => {
                fs.unlinkSync(`${downLoc}\\Supple Report.csv`);
              }
            );
          });
      } else res.send();
    }
  );
});

/////Download reval

app.post("/DownloadReval", (req, res) => {
  const year = parseInt(req.query.year);
  const sem = parseInt(req.query.sem);
  var ip = req.ip.slice(7);
  const ws = fs.createWriteStream(
    `${downLoc}\\Reval Registered ${year} - ${sem}.csv`
  );

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject Name", acYear as Year, sem as Semester, regDate as "Registered Dt", stat as Type, user as Registrant from paidreevaluation where acYear=${year} and sem=${sem} order by rollNo, acYear, sem, subCode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        data = data.map((row) => ({
          ...row,
          "Registered Dt": dayjs(row["Registered Dt"]).format("D MMM, YYYY"),
        }));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("reval", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Registered ${year} - ${sem}.csv`,
                `Reval Registered ${year} - ${sem}.csv`
              );
            });
        } else {
          res.send();
        }
      }
    );
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject Name", acYear as Year, sem as Semester, regDate as "Registered Dt", stat as Type, user as Registrant from paidreevaluation order by rollNo, acYear, sem, subCode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        data = data.map((row) => ({
          ...row,
          "Registered Dt": dayjs(row["Registered Dt"]).format("D MMM, YYYY"),
        }));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("reval", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Registered ${year} - ${sem}.csv`,
                `Reval Registered ${year} - ${sem}.csv`
              );
            });
        } else {
          res.send();
        }
      }
    );
  }
});
////REVAL REPORT

/////Download reval

app.post("/DownloadRevalRep", (req, res) => {
  var ip = req.ip.slice(7);
  const ws = fs.createWriteStream(`${downLoc}\\Reval Report.csv`);
  db.query(
    `select subCode as "Code", subName as "Subject Name",count(*) as Total from paidreevaluation p group by subCode,subName order by Total desc, subCode;`,
    (err, result) => {
      if (err) {
        res.send({ err: err });
      }
      let data = JSON.parse(JSON.stringify(result));
      if (data.length > 0) {
        fastcsv
          .write(data, { headers: true })
          .on("finish", () => {
            downMessage("reval report", ip);
          })
          .pipe(ws)
          .on("close", () => {
            res.download(`${downLoc}\\Reval Report.csv`, "Reval Report.csv");
          });
      } else res.send();
    }
  );
});

app.post("/DownloadRevalPrint", (req, res) => {
  const year = parseInt(req.query.year);
  const sem = parseInt(req.query.sem);
  var ip = req.ip.slice(7);
  const ws = fs.createWriteStream(`${downLoc}\\Reval Un-Registered.csv`);

  //console.log(year, sem)

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", regDate as "Registration Dt", user as Registrant from printreval where acYear=${year} and sem=${sem} order by rollNo, subCode`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Un-Registered.csv`,
                "Reval Un-Registered.csv"
              );
            });
        } else res.send();
      }
    );
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", regDate as "Registration Dt" from printreval order by rollNo, acYear, sem, subCode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Un-Registered.csv`,
                "Reval Un-Registered.csv"
              );
            });
        } else res.send();
      }
    );
  } else if (year !== 0 && sem == 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", regDate as "Registration Dt", user as Registrant from printreval where acYear=${year} order by rollNo, subCode`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Un-Registered.csv`,
                "Reval Un-Registered.csv"
              );
            });
        } else res.send();
      }
    );
  }
});

////////////////TRUNC SUPPLY
app.post("/TruncSupply", (req, res) => {
  console.log("hi");
  var ip = req.ip.slice(7);
  const year = parseInt(req.body.year);
  const sem = parseInt(req.body.sem);

  if (year === 0 && sem === 0) {
    db.query("truncate paidsupply;", (err, result) => {
      if (result) {
        messtrunk(ip, " supply ");
        res.send({ del: true });
      } else if (err) {
        res.send({ del: false });
      }
    });
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `delete from paidsupply where acYear = ${year} and sem = ${sem};`,
      (err, result) => {
        if (result) {
          messtrunk(ip, ` ${year}-${sem} from Paid Supply `);
          res.send({ del: true });
        } else if (err) {
          res.send({ del: false });
        }
      }
    );
  }
});

////////TRUNC REVAL
app.post("/TruncReval", (req, res) => {
  var ip = req.ip.slice(7);
  const year = parseInt(req.body.year);
  const sem = parseInt(req.body.sem);

  if (year === 0 && sem === 0) {
    db.query("truncate paidreevaluation;", (err, result) => {
      if (result) {
        messtrunk(ip, " Reval ");
        res.send({ del: true });
      } else if (err) {
        res.send({ del: false });
      }
    });
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `delete from paidreevaluation where acYear = ${year} and sem = ${sem};`,
      (err, result) => {
        if (result) {
          messtrunk(ip, ` ${year}-${sem} from Paid Reval `);
          res.send({ del: true });
        } else if (err) {
          res.send({ del: false });
        }
      }
    );
  }
});

////CBT SEARCH
app.post("/CbtSearch", (req, res) => {
  // console.log(req.body)
  const acYear = req.body.acYear;
  const sem = req.body.sem;
  const reg = req.body.reg;
  const branch = req.body.branch;
  const ans = [];
  const names = [];
  const mapper = {};
  const rollNo = req.body.rno;
  const ansObj = {};

  db.query(
    `select * from printcbt where rollNo='${rollNo}' and acYear= ${acYear} and sem = ${sem};`,
    (err, result) => {
      if (result.length > 0) {
        db.query(
          `select subCode from printcbt where rollNo="${rollNo}";`,
          (err, result) => {
            if (result) {
              result.forEach((e) => {
                ans.push(e.subCode);
              });
            }
          }
        );
        db.query(
          `select subCode, subName from printcbt where rollNo = "${rollNo}";`,
          (err, result) => {
            if (result) {
              const out = JSON.parse(JSON.stringify(result));
              result.forEach((e) => {
                mapper[e["subCode"]] = e["subName"];
                names.push(e.subName);
              });
              // console.log("hehe")
              res.send({ out, ans, mapper, names, print: true });
            }
          }
        );
      } else {
        db.query(
          `select t.subCode from cbtsubjects t Left join paidcbt p on t.subCode=p.subCode and p.rollNo="${rollNo}" where t.acYear=${acYear} and t.sem=${sem} and p.subCode is null and t.regYear=${reg} and t.branch="${branch}";`,
          (err, result) => {
            if (err) {
              console.log("errr" + err);
              res.status(500).end("err");
            }
            if (result) {
              result.forEach((e) => {
                ans.push(e.subCode);
              });
            }
          }
        );
        db.query(
          `select t.subCode,t.subName from cbtsubjects t Left join paidcbt p on t.subCode=p.subCode and p.rollNo="${req.body.rno}" where t.acYear=${acYear} and t.sem=${sem} and p.subCode is null and t.regYear=${reg} and t.branch="${branch}";`,
          (err, result) => {
            if (err) {
              console.log("errr" + err);
              res.status(500).end("err");
            }
            if (result) {
              const out = JSON.parse(JSON.stringify(result));
              result.forEach((e) => {
                mapper[e["subCode"]] = e["subName"];
                ansObj[
                  ((subCode = `${e["subCode"]}`), (subName = `${e["subName"]}`))
                ];
                names.push(e.subName);
              });
              // console.log("hehe")
              res.send({ out, ans, mapper, names, ansObj, print: false });
              // res.send({ out })
            }
          }
        );
      }
    }
  );
});

app.post(`/printCbt`, (req, res) => {
  const acYear = req.body.acYear;
  const sem = req.body.sem;
  const subCode = req.body.subCode;
  const rno = req.body.rno;
  const subName = req.body.subName;
  const branch = req.body.branch;
  var ip = req.ip.slice(7);
  var count = 0;

  subCode.forEach((e) => {
    db.query(
      `insert ignore into printcbt(rollNo, subCode, acYear, sem, subName, regDate, branch, user)values("${rno}","${e}","${acYear}","${sem}","${subName[count]}", curdate(),"${branch}", (select userName from userip where ip = "${ip}"));`,
      (err, _result) => {
        if (err) {
          res.send({ err: true });
          console.log(err);
        }
      }
    );
    count++;
  });
  message(rno, "took print for CBT for ", ip);
  res.send({ done: true });
});

////CBT REGISTER

app.post("/CbtRegister", (req, res) => {
  const acYear = req.body.acYear;
  const sem = req.body.sem;
  const subCode = req.body.subCode;
  const rno = req.body.rno;
  const subName = req.body.subName;
  const branch = req.body.branch;
  var ip = req.ip.slice(7);
  let count = 0;

  subCode.forEach((e) => {
    db.query(
      `insert ignore into paidcbt(rollNo, subCode, acYear, sem, subName, regDate, branch, user)values("${rno}","${e}","${acYear}","${sem}","${subName[count]}", curdate(),"${branch}", (select userName from userip where ip = "${ip}"))`,
      (err) => {
        if (err) {
          res.status(500).send("errrr" + err);
        }
      }
    );
    count++;
  });

  db.query(`delete from printcbt where rollNo = "${rno}";`);

  message(rno, "has CBT Registered for ", ip);
  res.send({ succ: true });
});

////TRUNCATE PAID CBT
app.post("/TruncCBT", (req, res) => {
  let ip = req.ip.slice(7);
  const year = parseInt(req.body.year);
  const sem = parseInt(req.body.sem);

  if (year === 0 && sem === 0) {
    db.query("truncate paidcbt;", (err, result) => {
      if (err) {
        res.status(500).send("errrr" + err);
      }
      if (result) {
        db.query("truncate cbtsubjects", (er, re) => {
          if (er) {
            res.status(500).send("errrr" + err);
          }
          if (re) {
            messtrunk(ip, ` Paid CBT `);
            res.send({ del: true });
          }
        });
      }
    });
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `delete from paidcbt where acYear = ${year} and sem = ${sem};`,
      (err, result) => {
        if (result) {
          messtrunk(ip, ` ${year}-${sem} from Paid CBT `);
          res.send({ del: true });
        } else if (err) {
          res.send({ del: false });
        }
      }
    );
  }
});

////DOWNLOAD paid cbt
app.post("/DownloadCBT", (req, res) => {
  const year = parseInt(req.query.year);
  const sem = parseInt(req.query.sem);
  var ip = req.ip.slice(7);
  const ws = fs.createWriteStream(`${downLoc}\\CBT Registered.csv`);

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", branch as "Branch", regDate as "Registration Dt", user as Registrant from paidcbt where acYear=${year} and sem=${sem} order by rollNo, subCode`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Registered.csv`,
                "CBT Registered.csv"
              );
            });
        } else res.send();
      }
    );
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", branch as "Branch", regDate as "Registration Dt", user as Registrant from paidcbt order by rollNo, acYear, sem, subCode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Registered.csv`,
                "CBT Registered.csv"
              );
            });
        } else res.send();
      }
    );
  }
});

app.post("/DownloadCBTPrint", (req, res) => {
  const year = parseInt(req.query.year);
  const sem = parseInt(req.query.sem);
  var ip = req.ip.slice(7);
  const ws = fs.createWriteStream(`${downLoc}\\CBT Un-Registered.csv`);

  //console.log(year, sem)

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", branch as "Branch", regDate as "Registration Dt", user as Registrant from printcbt where acYear=${year} and sem=${sem} order by rollNo, subCode`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Un-Registered.csv`,
                "CBT Un-Registered.csv"
              );
            });
        } else res.send();
      }
    );
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", branch as "Branch", regDate as "Registration Dt" from printcbt order by rollNo, acYear, sem, subCode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Un-Registered.csv`,
                "CBT Un-Registered.csv"
              );
            });
        } else res.send();
      }
    );
  } else if (year !== 0 && sem == 0) {
    db.query(
      `select rollNo as "Ht Number", subCode as "Code", subName as "Subject", acYear as "Year", sem as "Semester", branch as "Branch", regDate as "Registration Dt", user as Registrant from printcbt where acYear=${year} order by rollNo, subCode`,
      (err, result) => {
        if (err) {
          res.send({ err: err });
        }
        let data = JSON.parse(JSON.stringify(result));
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip);
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Un-Registered.csv`,
                "CBT Un-Registered.csv"
              );
            });
        } else res.send();
      }
    );
  }
});
/////cbt report

app.post("/DownloadCBTRep", (req, res) => {
  const year = req.query.year;
  const sem = req.query.sem;
  var ip = req.ip.slice(7);
  // //console.log(year, sem)
  // var table = req.body.table
  const ws = fs.createWriteStream(`${downLoc}\\CBT Report.csv`);
  db.query(
    `select branch as Branch,subCode as Code,subName as Subject,count(*) as Total from paidcbt group by branch, subCode, subName, acYear,sem order by Total desc, subCode;`,
    (err, result) => {
      if (err) {
        res.send({ err: err });
      }
      let data = JSON.parse(JSON.stringify(result));
      if (data.length > 0) {
        fastcsv
          .write(data, { headers: true })
          .on("finish", () => {
            downMessage("CBT report", ip);
          })
          .pipe(ws)
          .on("close", () => {
            res.download(`${downLoc}\\CBT Report.csv`, "CBT Report.csv");
          });
      } else res.send();
    }
  );
});

////upload cbt
app.post("/UpdateCBT", (req, res) => {
  const acYear = req.body.acYear;
  const sem = req.body.sem;
  const regYear = req.body.exYear;
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let filesRead = 0;
  let totalFiles = 0;
  let flag = false;
  let erfiles = [];
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true });
      console.log("error" + err);
    } else {
      totalFiles = files.length;
    }
  });
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err);
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            // console.log(Object.keys(s[1], "SSS"))
            let subCode = Object.keys(s[0])[0];
            let subName = Object.keys(s[0])[1];
            let branch = Object.keys(s[0])[2];
            let count = 0;
            // res.send({ done: true })
            console.log("Uploading ", fname);
            s.forEach((e) => {
              // console.log(subCode, subName, grade, e["rollNo"], e[grade])
              if (typeof subName === "string" && typeof subCode === "string") {
                db.query(
                  `insert ignore into cbtsubjects(subCode,subName,acYear,sem,regYear,branch) values ("${e[subCode]}","${e[subName]}",${acYear},${sem},${regYear},"${e[branch]}")`,
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      erfiles.push(fname);
                    }
                    if (result) {
                      count++;
                      if (count === s.length) {
                        filesRead++;
                        upMessage(fname, ip, "CBT ");
                        console.log(filesRead, " uploaded", fname);
                        if (filesRead === totalFiles) {
                          console.log("Error files", erfiles);
                          res.send({
                            done: true,
                            tot: filesRead,
                            ertot: erfiles.length,
                            erf: erfiles,
                          });
                        }
                      }
                    }
                  }
                );
              } else {
                flag = true;
              }
            });
            if (flag) {
              erfiles.push(fname);
              flag = false;
            }
          });
      });
    }
  });
  // console.log("Error files", erfiles)
});
///fetch cbtbranches
app.post("/Branch", (_req, res) => {
  let branch = [];
  let acYear = [];
  let sem = [];
  db.query(
    "select distinct branch from cbtsubjects order by branch asc;",
    (err, result) => {
      if (result) {
        result.forEach((e) => {
          branch.push(e["branch"]);
        });
      } else if (err) {
        res.status(500).send(err);
        console.log("eerr", err);
      }
    }
  );
  db.query(
    "select distinct acYear from cbtsubjects ORDER BY acYear asc;",
    (err, result) => {
      if (result) {
        result.forEach((e) => {
          acYear.push(e["acYear"]);
        });
      } else if (err) {
        res.status(500).send(err);
        console.log("eerr", err);
      }
    }
  );
  db.query(
    "select distinct sem from cbtsubjects order by sem asc;",
    (err, result) => {
      if (result) {
        result.forEach((e) => {
          sem.push(e["sem"]);
        });
        res.send({ branch, acYear, sem });
      } else if (err) {
        res.status(500).send(err);
        console.log("eerr", err);
      }
    }
  );
});

////////Add User

app.post("/AddUser", (req, res) => {
  const userName = req.body.userName;
  const password = md5(req.body.password);
  const pass = req.body.password;
  var ip = req.ip.slice(7);

  db.query(
    `insert into users(userName,password) values("${userName}","${password}")`,
    (err, result) => {
      if (err) {
        res.send({ Valid: false });
      }
      if (result) {
        var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
        db.query(`select userName from userip where ip="${ip}"`, (_err, re) => {
          if (re) {
            fs.appendFile(
              "log.txt",
              "\n[" +
                dt +
                ']\t"' +
                re[0]["userName"] +
                `" added new user ` +
                userName +
                " " +
                pass +
                " from " +
                ip,
              function (_er) {}
            );
          }
        });
        res.send({ Valid: true });
      }
    }
  );
});

//upload costs
app.post("/Costs", (req, res) => {
  ip = req.ip.slice(7);
  const values = [
    {
      col: "sbc",
      val: req.body.sbc,
    },
    {
      col: "sac",
      val: req.body.sac,
    },
    {
      col: "sfc",
      val: req.body.smc,
    },
    {
      col: "rev",
      val: req.body.reval,
    },
    {
      col: "cbc",
      val: req.body.cbc,
    },
    {
      col: "cac",
      val: req.body.cac,
    },
    {
      col: "cfc",
      val: req.body.cmc,
    },
  ];
  values.map((element) => {
    db.query(
      `update costs set ${element.col} = ${element.val} where 1;`,
      (err, result) => {
        if (err) console.log(err);
        else {
          // console.log(result);
          result = JSON.parse(JSON.stringify(result));
          // console.log(result);
        }
      }
    );
  });
  messageIp("updated costs ", ip);
  res.send({ done: true });
});

app.post("/Fines", (req, res) => {
  const no_fine = req.body.nofinedt;
  const values = [
    {
      fineName: "fine_1",
      cost: req.body.fine_1,
      dateName: "fine_1Dt",
      date: req.body.fine_1Dt,
    },
    {
      fineName: "fine_2",
      cost: req.body.fine_2,
      dateName: "fine_2Dt",
      date: req.body.fine_2Dt,
    },
    {
      fineName: "fine_3",
      cost: req.body.fine_3,
      dateName: "fine_3Dt",
      date: req.body.fine_3Dt,
    },
  ];

  db.query(`update costs set no_fine = "${no_fine}";`);
  values.map((element) => {
    db.query(`update costs set ${element.fineName} = ${element.cost};`);
    db.query(`update costs set ${element.dateName} = "${element.date}";`);
  });

  messageIp("updated fines ", req.ip.slice(7));
  res.send({ done: true });
});

//DelEntry

app.post("/DelEntry", (req, res) => {
  const rollNo = req.body.rollNo;
  const table = req.body.table;
  let flag = true;
  var ip = req.ip.slice(7);
  const subCodes = req.body.subCodes;
  subCodes.forEach((e) => {
    db.query(
      `delete from ${table} where rollNo="${rollNo}" and subCode="${e}"`,
      (err, result) => {
        if (err) {
          res.send({ delete: false });
          flag = false;
        }
        if (result) {
          message(rollNo, `has deleted paid entries from ${table} `, ip);
        }
      }
    );
  });
  if (flag) {
    res.send({ delete: true });
  }
});

//get costs
app.post("/getCosts", (_req, res) => {
  db.query(`select * from costs;`, (err, result) => {
    try {
      if (err) {
        console.log("Error!", err);
        res.send({ error: true });
      } else if (result) {
        result = JSON.parse(JSON.stringify(result));
        res.send({ arr: result });
      }
    } catch (e) {
      console.log(e);
    }
  });
});

const messageEx = async () => {
  var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
  console.log("Good-bye!");
  fs.appendFile(
    "log.txt",
    "\n[" + dt + "]\tServer Stopped!!",
    function (_err) {}
  );
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit();
};

//del entry getpaid data
app.post("/GetPaid", (req, res) => {
  const acYear = parseInt(req.body.year);
  const sem = parseInt(req.body.sem);
  const dict = {};

  let setsem = "sem";
  if (req.body.table === "paidcbt") {
    setsem = "sem";
  }
  db.query(
    `select * from ${req.body.table} where rollNo="${req.body.rollNo}" and acYear=${acYear} and ${setsem}=${sem}`,
    (err, result) => {
      if (err) {
        console.log(err);
        res.send({ ahead: false });
      } else if (result) {
        let subCodes = [];
        let subNames = [];
        for (i in result) {
          const code = result[i].subCode;
          dict[`${code}`] = result[i].subName;
          subCodes.push(result[i].subCode);
          subNames.push(result[i].subName);
        }
        res.send({
          ahead: true,
          subNames: subNames,
          subCodes: subCodes,
          K: subCodes.length,
        });
      }
    }
  );
});

////  STUDENT INFO RETRIEVE
app.post("/getInfo", (req, res) => {
  const rno = req.body.rno;
  const year = parseInt(req.body.year);
  const sem = parseInt(req.body.sem);
  const table = req.body.table;
  const printSubs = [];

  if (year === 0 && sem === 0) {
    db.query(
      `select * from ${table} where rollNo="${rno}" order by acYear asc, sem asc, subCode asc;`,
      (err, result) => {
        try {
          if (err) {
            console.log("Error!", err);
          } else if (result) {
            let fCount = 0;
            let data = JSON.parse(JSON.stringify(result));
            // console.log(data)
            if (table === "studentinfo") {
              // console.log("inside fCount if")
              data.map((value) => {
                if (value.grade === "F" || value.grade.toLowerCase() === "ab")
                  fCount++;
              });
            }

            if (
              table === "printcbt" ||
              table === "printsupply" ||
              table === "printreval"
            ) {
              data.forEach((e) => {
                printSubs.push(e["subName"]);
              });
            }
            // console.log(printSubs, fCount)
            if (data.length > 0)
              res.send({ info: data, printSubs, fCount: fCount });
            else res.send({ miss: true });
          }
        } catch (e) {
          console.log(e);
        }
      }
    );
  } else if (year !== 0 && sem === 0) {
    db.query(
      `select * from ${table} where rollNo="${rno}" and acYear=${year} order by sem asc, subCode asc;`,
      (err, result) => {
        try {
          if (err) {
            console.log("Error!", err);
          } else if (result) {
            let fCount = 0;
            let data = JSON.parse(JSON.stringify(result));
            data.map((value) => {
              if (value.grade === "F" || value.grade.toLowerCase() === "ab")
                fCount++;
            });
            if (data !== 0) res.send({ info: data, fCount: fCount });
            else res.send({ miss: true });
          }
        } catch (e) {
          console.log(e);
        }
      }
    );
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `select * from ${table} where rollNo="${rno}" and acYear=${year} and sem=${sem} order by subCode asc;`,
      (err, result) => {
        try {
          if (err) {
            console.log("Error!", err);
          } else if (result) {
            let fCount = 0;
            let data = JSON.parse(JSON.stringify(result));
            data.map((value) => {
              if (value.grade === "F" || value.grade.toLowerCase() === "ab")
                fCount++;
            });
            if (data !== 0) res.send({ info: data, fCount: fCount });
            else res.send({ miss: true });
          }
        } catch (e) {
          console.log(e);
        }
      }
    );
  } else if (year === 0 && sem !== 0) {
    res.send({ miss: true });
  }
});

////  DOWNLOAD STUDENT INFO
app.post("/downInfo", (req, res) => {
  const rno = req.query.rno;
  const ip = req.ip.slice(7);
  const table = req.query.table;
  const ws = fs.createWriteStream(`${downLoc}\\Student Details\\${rno}.csv`);
  db.query(
    `select rollNo as "Roll Number", subCode as Code, subName as Subject, grade as Grade, acYear as Year, sem as Semester, exYear as "Exam Year", exMonth as "Exam Month", gradePoint as Grade, credits as Credits, orCredits as "Subject Credits" from ${table} where rollNo="${rno}" order by acYear asc, sem asc, subCode asc;`,
    (err, result) => {
      try {
        if (err) {
          console.log("Error!", err);
        } else if (result) {
          let data = JSON.parse(JSON.stringify(result));
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              message(
                rno + " (via Manage Database)",
                "has downloaded details of ",
                ip
              );
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Student Details\\${rno}.csv`,
                `${rno}.csv`
              );
            });

          res.send({ info: arr });
        }
      } catch (e) {
        console.log(e);
      }
    }
  );
});

//  EDIT INFO (studentinfo)
app.post(`/editinfo`, (req, res) => {
  let subCode = req.body.subCode;
  let subName = req.body.subName;
  let grade = req.body.grade;
  let year = req.body.year;
  let sem = req.body.sem;
  let exYear = req.body.exYear;
  let exMonth = req.body.exMonth;
  let rollNo = req.body.rno;
  let table = req.body.table;
  let refcode = req.body.refcode;

  if (table === "studentinfo") {
    db.query(
      `update studentinfo set subCode='${subCode}', subName='${subName}', grade='${grade}', acYear=${year}, sem=${sem}, exYear=${exYear}, exMonth=${exMonth} where rollNo='${rollNo}' and subCode='${refcode}';`,
      (err, result) => {
        if (result) {
          message(
            `${rollNo} - ${refcode} details in ${table}`,
            `edited `,
            req.ip.slice(7)
          );
          res.send({ done: true });
        } else {
          console.log(err);
          res.send({ err: true });
        }
      }
    );
  } else {
    db.query(
      `update ${table} set subCode='${subCode}', subName='${subName}', acYear=${year}, sem=${sem} where rollNo='${rollNo}' and subCode='${refcode}';`,
      (err, result) => {
        if (result) {
          message(
            `${rollNo} - ${refcode} details in ${table}`,
            `edited `,
            req.ip.slice(7)
          );
          res.send({ done: true });
        } else {
          console.log(err);
          res.send({ err: true });
        }
      }
    );
  }
});

app.post(`/deleteinfo`, (req, res) => {
  let rollNo = req.body.rno;
  let subCode = req.body.subCode;
  let table = req.body.table;

  db.query(
    `delete from ${table} where rollNo= "${rollNo}" and subCode= "${subCode}";`,
    (_err, result) => {
      if (result) {
        message(rollNo, `deleted details from ${table} for `, req.ip.slice(7));
        res.send({ done: true });
      } else {
        res.send({ err: true });
      }
    }
  );
});

//  ADD INFO
app.post(`/addinfo`, (req, res) => {
  let rollNo = req.body.rollNo;
  let subCode = req.body.subCode;
  let subName = req.body.subName;
  let grade = req.body.grade;
  let year = req.body.year;
  let sem = req.body.sem;
  let exYear = req.body.exYear;
  let exMonth = req.body.exMonth;
  let table = req.body.table;

  // console.log(
  //   rollNo,
  //   subCode,
  //   subName,
  //   grade,
  //   year,
  //   sem,
  //   exYear,
  //   exMonth,
  //   table
  // )

  if (table === "studentinfo") {
    db.query(
      `insert into studentinfo (rollNo, subCode, subName, grade, acYear, sem, exYear, exMonth) values ("${rollNo}", "${subCode}", "${subName}", "${grade}", ${year}, ${sem}, "${exYear}", "${exMonth}");`,
      (err, result) => {
        if (result) {
          message(
            rollNo,
            "edited details of studentinfo for ",
            req.ip.slice(7)
          );
          res.send({ done: true });
        } else if (err.errno === 1054) {
          console.log(err);
          res.send({ wrongvalue: true });
        } else if (err.errno === 1062) {
          console.log(err);
          res.send({ dupe: true });
        }
      }
    );
  } else {
    db.query(
      `insert into ${table} (rollNo, subCode, subName, acYear, sem, regDate) values ('${rollNo}', '${subCode}', '${subName}', ${year}, ${sem}, curdate());`,
      (err, result) => {
        if (result) {
          message(rollNo, `edited details of ${table} for`, req.ip.slice(7));
          res.send({ done: true });
        } else if (err.errno === 1054) {
          console.log(err, "1");
          res.send({ wrongvalue: true });
        } else if (err.errno === 1062) {
          console.log(err, "1");
          res.send({ dupe: true });
        }
      }
    );
  }
});

///////////////////
// view Gpa

app.post(`/ViewData`, (req, res) => {
  let rollNo = req.body.rollNo;
  let year = req.body.year;
  let sem = req.body.sem;
  console.log(rollNo, year, sem);
  res.send({ view: true });
});
app.post(`/uploadcreds`, (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let filesRead = 0;
  let totalFiles = 0;
  let flag = false;
  let erfiles = [];
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("error" + err);
    } else {
      totalFiles = files.length;
      console.log("Supply files found " + totalFiles);
    }
  });
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err);
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            // console.log(Object.keys(s[1], "SSS"))
            let subCode = Object.keys(s[0])[0];
            let credit = Object.keys(s[0])[1];
            let count = 0;
            s.forEach((e) => {
              if (typeof subCode === "string" && typeof credit === "string") {
                // console.log("Inside if");
                if (e[credit] !== "") {
                  db.query(
                    // `replace into studentinfo (rollNo, grade, exYear, exMonth, subCode, subName, acYear, sem) values("${e["rollNo"]}",${e[credit]},${exYear}, ${exMonth},"${subCode}","${subName}",${acYear},${sem});`,
                    `replace into subcred(subCode,credits) values("${
                      e[subCode]
                    }",${parseInt(e[credit])});`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!");
                          erfiles.push(fname);
                        }
                        count++;
                        if (count === s.length) {
                          filesRead++;
                          upMessage(fname, ip, "credits ");
                          console.log(filesRead, " uploaded", fname);
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles);
                            db.query(
                              `update studentinfo stu inner join grades g on stu.grade=g.grade set stu.gradePoint=g.gradePoint;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err);
                                } else if (result) {
                                  console.log(result);
                                }
                              }
                            );
                            db.query(
                              `update studentinfo stu inner join subcred g on stu.subCode=g.subCode set stu.credits=stu.gradePoint*g.credits;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err);
                                } else if (result) {
                                  console.log(result);
                                }
                              }
                            );
                            db.query(
                              `update studentinfo stu inner join subcred g on stu.subCode=g.subCode set stu.ocredits=g.credits;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err);
                                } else if (result) {
                                  console.log(result);
                                }
                              }
                            );
                            messageIp("updated credits ", req.ip.slice(7));
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            });
                          }
                        }
                      } catch (e) {
                        console.log(e);
                      }
                    }
                  );
                } else {
                  count++;
                }
              } else {
                flag = true;
              }
            });
          });
      });
      if (flag) {
        erfiles.push(fname);
        flag = false;
      }
    }
  });
});

//  DELETING PRINT ENTRIES
app.post(`/deleteprintcbt`, (req, res) => {
  const rollNo = req.body.rollNo;

  db.query(
    `delete from printcbt where rollNo = "${rollNo}";`,
    (err, result) => {
      if (err) {
        res.send({ err: true });
      } else if (result) {
        message(rollNo, "deleted values from print CBT for ", req.ip.slice(7));
        res.send({ done: true });
      }
    }
  );
});

app.post(`/deleteprintsupply`, (req, res) => {
  const rollNo = req.body.rollNo;

  db.query(
    `delete from printsupply where rollNo = "${rollNo}";`,
    (err, result) => {
      if (err) {
        res.send({ err: true });
      } else if (result) {
        message(
          rollNo,
          "deleted values from print supple for ",
          req.ip.slice(7)
        );
        res.send({ done: true });
      }
    }
  );
});

app.post("/deleyeprintreval", (req, res) => {
  const rollNo = req.body.rollNo;

  db.query(
    `delete from printreval where rollNo = "${rollNo}";`,
    (err, result) => {
      if (err) {
        res.send({ err: true });
      } else if (result) {
        message(
          rollNo,
          "deleted values from print reval for ",
          req.ip.slice(7)
        );
        res.send({ done: true });
      }
    }
  );
});
/////////////////
///////////////

app.get("/subCode-count", async (_, res) => {
  console.clear();
  let count = 0;
  let codes = [];
  let errCount = 0;
  db.query(`SELECT DISTINCT subCode FROM studentinfo;`, (_err, result) => {
    result.forEach((code) => {
      codes.push(code.subCode);
    });
    codes.map((value) => {
      db.query(
        `SELECT DISTINCT subCode, subName FROM studentinfo WHERE (SELECT COUNT(distinct subName) FROM studentinfo WHERE subCode = "${value}") >= 2 AND subCode = "${value}";`,
        (_err, result_1) => {
          count++;
          if (result_1.length > 0) {
            errCount++;
            result_1.map((value) => {
              console.log(value.subCode, value.subName);
            });
            console.log(` `);
          }
          if (count === codes.length) {
            res.send({ done: true });
            console.log(
              `${errCount} codes have multiple names\n=======================  XXX  =======================`
            );
          }
        }
      );
    });
  });
});

app.post("/codeNames", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\");
  let count = 0;
  var ip = req.ip.slice(7);

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ fileErr: true });
      // console.log(err)
    } else {
      files.forEach((fname) => {
        if (fname === "code-names.csv") {
          csvtojson()
            .fromFile(`${loc}\\${fname}`)
            .then((table) => {
              let code = Object.keys(table[0])[0];
              let name = Object.keys(table[0])[1];

              table.forEach((value) => {
                db.query(
                  `INSERT IGNORE INTO codenames VALUES ("${value[code]}", "${value[name]}");`,
                  (er, result) => {
                    if (result) {
                      count++;
                      if (count === table.length) {
                        messageIp("uploaded code names ", req.ip.slice(7));
                        res.send({ done: true });
                      }
                    } else if (er) {
                      // console.log(er)
                      res.send({ upErr: true });
                    }
                  }
                );
              });
            });
        }
      });
    }
  });
});

app.listen(6969, () => {
  console.log("Server Started!!");
  var dt = dayjs().format("D-MMM-YYYY hh:mm:ss A");
  fs.appendFile(
    "log.txt",
    "\n[" + dt + "]\tServer Started!!",
    function (_err) {}
  );

  process.on("SIGINT", messageEx.bind());
});
