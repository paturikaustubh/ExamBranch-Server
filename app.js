const express = require("express")
const mysql = require("mysql")
const cors = require("cors")
const app = express()
const fastcsv = require("fast-csv")
const fs = require("fs")
const csvtojson = require("csvtojson")
const multer = require("multer")
var datetime = require("node-datetime")
app.use(express.json())
app.use(cors())
const md5 = require("md5-nodejs")

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "root",
  database: "practice",
  multipleStatements: true,
})

let downLoc = "..\\Downloads\\"

//LOG!!
var messageIp = (mess, ip) => {
  var dt = datetime.create()
  dt = dt.format("Y-m-d  H:M:S")
  db.query(`select username from userip where ip="${ip}"`, (_err, result) => {
    if (result) {
      fs.appendFile(
        "log.txt",
        "\n[" + dt + ']\t"' + result[0]["username"] + '" ' + mess + ip,
        function (_er) {}
      )
    }
  })
}

var messtrunk = (ip, name) => {
  var dt = datetime.create()
  dt = dt.format("Y-m-d  H:M:S")
  db.query(`select username from userip where ip="${ip}"`, (_err, result) => {
    if (result) {
      fs.appendFile(
        "log.txt",
        "\n[" +
          dt +
          ']\t"' +
          result[0]["username"] +
          '" truncated ' +
          name +
          " from " +
          ip,
        function (_er) {}
      )
    }
  })
}

var message = (rollno, mess, ip) => {
  var dt = datetime.create()
  dt = dt.format("Y-m-d  H:M:S")
  try {
    db.query(`select username from userip where ip="${ip}"`, (_err, result) => {
      if (result) {
        fs.appendFile(
          "log.txt",
          "\n[" +
            dt +
            ']\t"' +
            result[0]["username"] +
            '" ' +
            mess +
            rollno +
            " from " +
            ip,
          function (_er) {}
        )
      }
    })
  } catch (err) {}
}

var upMessage = (fname, ip, type) => {
  var dt = datetime.create()
  dt = dt.format("Y-m-d  H:M:S")
  try {
    db.query(`select username from userip where ip="${ip}"`, (_err, result) => {
      if (result) {
        fs.appendFile(
          "log.txt",
          "\n[" +
            dt +
            ']\t"' +
            result[0]["username"] +
            '" uploaded  ' +
            type +
            fname +
            " from " +
            ip,
          function (_er) {}
        )
      }
    })
  } catch (err) {}
}

var downMessage = (table, ip) => {
  var dt = datetime.create()
  dt = dt.format("Y-m-d  H:M:S")
  try {
    db.query(`select username from userip where ip="${ip}"`, (_err, result) => {
      if (result) {
        fs.appendFile(
          "log.txt",
          "\n[" +
            dt +
            ']\t"' +
            result[0]["username"] +
            '" downloaded ' +
            table +
            " from " +
            ip,
          function (_er) {}
        )
      }
    })
  } catch (err) {}
}

///Regularr
app.post("/Storeregular", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(500).json(err)
    }
    fname = req.file.originalname
    return res.status(200).send(req.file)
  })
})

app.post("/DownBack", (req, res) => {
  const ws = fs.createWriteStream(`${downLoc}\\backup.csv`)
  db.query(`select * from studentinfo`, (err, result) => {
    const data = JSON.parse(JSON.stringify(result))

    fastcsv
      .write(data, { headers: true })
      .on("finish", () => {})
      .pipe(ws)
      .on("close", () => {
        res.download(`${downLoc}\\backup.csv`, "backup.csv")
      })
    messageIp("Made backup from", req.ip.slice(7))
    if (err) {
      res.send({ del: false })
    }
  })
})

app.post("/UpBack", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let count = 0
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("Error lol", err)
    } else {
      files.forEach((fname) => {
        if (fname === "backup.csv") {
          csvtojson()
            .fromFile(`${loc}\\${fname}`)
            .then((s) => {
              let rno = Object.keys(s[0])[0] //ROLLNO
              let code = Object.keys(s[0])[1] //SUBCODE
              let sname = Object.keys(s[0])[2] //SUBNAME
              let grade = Object.keys(s[0])[3] //GRADE
              let acyr = Object.keys(s[0])[4] //ACYEAR
              let sem = Object.keys(s[0])[5] //SEM
              let exyr = Object.keys(s[0])[6] //EXYEAR
              let exmo = Object.keys(s[0])[7] //EXMONTH

              s.forEach((e) => {
                db.query(
                  `insert ignore into studentinfo (rollno, subcode, subname, grade, acyear, sem, exyear, exmonth) values ("${e[rno]}", "${e[code]}", "${e[sname]}", "${e[grade]}", ${e[acyr]}, ${e[sem]}, ${e[exyr]}, ${e[exmo]})`,
                  (err, _result) => {
                    try {
                      count++
                      console.clear()
                      console.log(
                        `Restored ${count}/${s.length} records\n${parseInt(
                          (count / s.length) * 100
                        )}%`
                      )
                      if (count === s.length) {
                        messageIp("restored detabase from ", ip)
                        console.log("Restore done.")
                        res.send({ done: true })
                      }
                      if (err) {
                        res.send({ err: true })
                      }
                    } catch (e) {
                      console.log(e)
                    }
                  }
                )
              })
              // }
            })
        }
      })
    }
  })
})

app.post("/UpdateRegular", (req, res) => {
  const acyear = req.body.acyear
  const sem = req.body.sem
  const exyear = req.body.exyear
  const exmonth = req.body.exmonth
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let filesRead = 0
  let totalFiles = 0
  let erfile = []
  let flag = false
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("error" + err)
      res.send({ err: true })
    } else {
      totalFiles = files.length
      console.log("Files found " + totalFiles)
    }
  })
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err)
    } else {
      console.clear()
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let subcode = Object.keys(s[0])[1].split("-")[0]
            let subname = Object.keys(s[0])[1].split("-")[1]
            let grade = Object.keys(s[0])[1]
            let count = 0
            console.log("Uploading ", fname)
            db.query(
              `SELECT * FROM codenames where subcode = "${subcode}" and subname = "${subname}"`,
              (err, result) => {
                if (err) {
                  console.log(err)
                } else if (result.length > 0) {
                  s.forEach((e) => {
                    if (
                      typeof subname === "string" &&
                      typeof subcode === "string" &&
                      Object.keys(s[0])[0] === "rollno"
                    ) {
                      if (e[grade] === "Ab") {
                        e[grade] = "F"
                      }

                      db.query(
                        `insert ignore into studentinfo(rollno,subcode,subname,grade,acyear,sem,exyear,exmonth) values("${e["rollno"]}","${subcode}","${subname}","${e[grade]}",${acyear},${sem},${exyear},${exmonth});`,
                        (err, _result) => {
                          try {
                            count++
                            if (count === s.length) {
                              filesRead++
                              upMessage(fname, ip, "regular ")
                              if (filesRead === totalFiles) {
                                console.log("Error files", erfile)
                                db.query(
                                  `update studentinfo stu inner join grades g on stu.grade=g.grade set stu.gradepoint=g.gradepoint;`,
                                  (err, result) => {
                                    if (err) {
                                      console.log(err)
                                    } else if (result) {
                                      console.log(result)
                                    }
                                  }
                                )
                                db.query(
                                  `update studentinfo stu inner join subcred g on stu.subcode=g.subcode set stu.credits=stu.gradepoint*g.credits;`,
                                  (err, result) => {
                                    if (err) {
                                      console.log(err)
                                    } else if (result) {
                                      console.log(result)
                                    }
                                  }
                                )
                                res.send({ done: true })
                              }
                            }
                            if (err) {
                              console.log(err, "Errorrrrrr!!!!")
                              erfile.push(fname)
                            }
                          } catch (e) {
                            console.log(e)
                          }
                        }
                      )
                    } else {
                      flag = true
                      count++
                      if (count === s.length) {
                        filesRead++
                        console.log(filesRead, "File format error ", fname)
                        if (filesRead === totalFiles) {
                          console.log("Error files", erfile)
                          res.send({
                            done: true,
                            tot: filesRead,
                            ertot: erfile.length,
                            erf: erfile,
                          })
                        }
                      }
                    }
                  })
                } else {
                  erfile.push(fname)
                  res.send({ ertot: erfile.length, erf: erfile })
                }
              }
            )
            if (flag) {
              erfile.push(fname)
              flag = false
            }
          })
      })
    }
    // upMessage(fname, ip, " regular ")
  })
})

///////supply||Reval
app.post("/Storesupply", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(500).json(err)
    }
    fname = req.file.originalname
    return res.status(200).send(req.file)
  })
})

app.post("/UpdateSupply", (req, res) => {
  // console.log(req.body)
  const acyear = req.body.acyear
  const sem = req.body.sem
  const exyear = req.body.exyear
  const exmonth = req.body.exmonth
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let filesRead = 0
  let totalFiles = 0
  let flag = false
  let erfiles = []
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true })
      console.log("error" + err)
    } else {
      totalFiles = files.length
      console.log("Supply files found " + totalFiles)
    }
  })
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err)
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            // console.log(Object.keys(s[1], "SSS"))
            let subcode = Object.keys(s[0])[1].split("-")[0]
            let subname = Object.keys(s[0])[1].split("-")[1]
            let grade = Object.keys(s[0])[1]
            let count = 0
            s.forEach((e) => {
              console.log(subcode, subname, e["rollno"], e[grade])
              if (typeof subcode === "string" && typeof subname === "string") {
                console.log("Inside if")
                if (e[grade] !== "") {
                  db.query(
                    `replace into studentinfo (rollno, grade, exyear, exmonth, subcode, subname, acyear, sem) values("${e["rollno"]}","${e[grade]}",${exyear}, ${exmonth},"${subcode}","${subname}",${acyear},${sem});`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!")
                          erfiles.push(fname)
                        }
                        count++
                        if (count === s.length) {
                          filesRead++
                          upMessage(fname, ip, "supplementary ")
                          console.log(filesRead, " uploaded", fname)
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles)
                            db.query(
                              `update studentinfo stu inner join grades g on stu.grade=g.grade set stu.gradepoint=g.gradepoint;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err)
                                } else if (result) {
                                  console.log(result)
                                }
                              }
                            )
                            db.query(
                              `update studentinfo stu inner join subcred g on stu.subcode=g.subcode set stu.credits=stu.gradepoint*g.credits;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err)
                                } else if (result) {
                                  console.log(result)
                                }
                              }
                            )
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            })
                          }
                        }
                      } catch (e) {
                        console.log(e)
                      }
                    }
                  )
                } else {
                  count++
                }
              } else {
                flag = true
              }
            })
          })
      })
      if (flag) {
        erfiles.push(fname)
        flag = false
      }
    }
  })
})

//  UPLOAD PAID SUPPLY
app.post("/UpdatePaidSupple", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let filesRead = 0
  let totalFiles = 0
  let flag = false
  let erfiles = []
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      // console.log("error" + err)
      res.send({ err: true })
    } else {
      totalFiles = files.length
      console.log(`${totalFiles} found!`)
    }
  })

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err)
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let rollno = Object.keys(s[0])[0]
            let subcode = Object.keys(s[0])[1]
            let subname = Object.keys(s[0])[2]
            let year = Object.keys(s[0])[3]
            let sem = Object.keys(s[0])[4]
            let regdate = Object.keys(s[0])[5]
            let user = Object.keys(s[0])[6]
            let count = 0
            s.forEach((e) => {
              console.log(e)
              if (typeof subcode === "string" && typeof subname === "string") {
                if (true) {
                  db.query(
                    `insert ignore into paidsupply (rollno, subcode, subname, acyear, sem, regdate, user) values("${e[rollno]}", "${e[subcode]}", "${e[subname]}", ${e[year]}, ${e[sem]}, "${e[regdate]}", "${e[user]}");`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!")
                          erfiles.push(fname)
                        }
                        count++
                        console.clear()
                        console.log(`${count}/${s.length} rows uploaded!`)
                        if (count === s.length) {
                          filesRead++
                          upMessage(fname, ip, "Paid Supply ")
                          console.clear()
                          console.log(filesRead, " uploaded", fname)
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles)
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            })
                          }
                        }
                      } catch (e) {
                        console.log(e)
                      }
                    }
                  )
                } else {
                  count++
                }
              } else {
                flag = true
              }
            })
          })
      })
      if (flag) {
        erfiles.push(fname)
        flag = false
      }
    }
  })
  // console.log("Error files", erfiles)
})
//  UPLOAD PAID REVAL
app.post("/UpdatePaidReval", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let filesRead = 0
  let totalFiles = 0
  let flag = false
  let erfiles = []
  var ip = req.ip.slice(7)

  console.log(ip)

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true })
      console.log("error" + err)
    } else {
      totalFiles = files.length
      console.log("Reval files found " + totalFiles)
    }
  })
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err)
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let rollno = Object.keys(s[0])[0]
            let subcode = Object.keys(s[0])[1]
            let subname = Object.keys(s[0])[2]
            let year = Object.keys(s[0])[3]
            let sem = Object.keys(s[0])[4]
            let regdate = Object.keys(s[0])[5]
            let stat = Object.keys(s[0])[6]
            let count = 0
            s.forEach((e) => {
              if (typeof subcode === "string" && typeof subname === "string") {
                if (true) {
                  db.query(
                    `insert ignore into paidreevaluation (rollno, subcode, subname, acyear, sem, regdate, stat) values("${e[rollno]}","${e[subcode]}","${e[subname]}", ${e[year]},${e[sem]},"${e[regdate]}", "${e[stat]}");`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!")
                          erfiles.push(fname)
                        }
                        count++
                        console.log(`${count}/${s.length} rows uploaded!`)
                        if (count === s.length) {
                          filesRead++
                          upMessage(fname, ip, "Paid Reval ")
                          console.log(filesRead, " uploaded", fname)
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles)
                            console.log(erfiles.length)
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            })
                          }
                        }
                      } catch (e) {
                        console.log(e)
                      }
                    }
                  )
                } else {
                  count++
                }
              } else {
                flag = true
              }
            })
          })
      })
      if (flag) {
        erfiles.push(fname)
        flag = false
      }
    }
  })
  // console.log("Error files", erfiles)
})

//  UPLOAD PAID CBT
app.post("/UpdatePaidCbt", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let filesRead = 0
  let totalFiles = 0
  let flag = false
  let erfiles = []
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true })
      console.log("error" + err)
    } else {
      totalFiles = files.length
      console.log("CBT files found " + totalFiles)
    }
  })
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err)
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            let rollno = Object.keys(s[0])[0]
            let subcode = Object.keys(s[0])[1]
            let subname = Object.keys(s[0])[2]
            let year = Object.keys(s[0])[3]
            let sem = Object.keys(s[0])[4]
            let regdate = Object.keys(s[0])[5]
            let branch = Object.keys(s[0])[6]
            let count = 0
            s.forEach((e) => {
              // console.log(subcode, subname, e["rollno"], e[grade])
              if (typeof subcode === "string" && typeof subname === "string") {
                if (true) {
                  db.query(
                    `insert ignore into paidcbt (rollno, subcode, subname, acyear, sem, regdate, branch) values("${e[rollno]}","${e[subcode]}","${e[subname]}", ${e[year]},${e[sem]},"${e[regdate]}", "${e[branch]}");`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!")
                          erfiles.push(fname)
                        }
                        count++
                        console.log(`${count}/${s.length} rows uploaded!`)
                        if (count === s.length) {
                          filesRead++
                          upMessage(fname, ip, "Paid CBT ")
                          console.log(filesRead, " uploaded", fname)
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles)
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            })
                          }
                        }
                      } catch (e) {
                        console.log(e)
                      }
                    }
                  )
                } else {
                  count++
                }
              } else {
                flag = true
              }
            })
          })
      })
      if (flag) {
        erfiles.push(fname)
        flag = false
      }
    }
  })
  // console.log("Error files", erfiles)
})

//////////////////////////////////////////

app.post("/printSupply", (req, res) => {
  const rno = req.body.rno
  const A = req.body.A
  const B = req.body.B
  const C = req.body.C
  const D = req.body.D
  const E = req.body.E
  const F = req.body.F
  const G = req.body.G
  const H = req.body.H
  const ip = req.ip.slice(7)

  A.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",1,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                console.log(err)
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })
  B.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",1,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  C.forEach((element) => {
    console.log(element)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",2,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                console.log(err)
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  D.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",2,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  E.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",3,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  F.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",3,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  G.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",4,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  H.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",4,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })
  message(rno, "took print for supple for ", ip)
  res.send({ done: true })
})

////supplyy

app.post("/Registersupply", (req, res) => {
  const rno = req.body.rno
  const A = req.body.A
  const B = req.body.B
  const C = req.body.C
  const D = req.body.D
  const E = req.body.E
  const F = req.body.F
  const G = req.body.G
  const H = req.body.H
  var ip = req.ip.slice(7)

  A.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",1,1, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  B.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",1,2, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  C.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",2,1, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  D.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",2,2, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  E.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",3,1, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  F.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",3,2, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  G.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",4,1, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  H.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into paidsupply(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",4,2, curdate(), (select username from userip where ip = "${ip}"))`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })
  message(rno, "has registered Supply for ", ip)
  db.query(`delete from printsupply where rollno = '${rno}';`)
  res.send({ registered: true })
})

app.post("/Supplysearch", (req, res) => {
  const rno = req.body.rno
  const gr = req.body.gr
  let ans = []
  let subnames = []
  let subcodes = []
  let mapper = {}
  let value = 0

  db.query(
    `select subname from printsupply where rollno = '${rno}';`,
    (_err, result) => {
      if (result.length > 0) {
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 1 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ A: tempSubs })
              subcodes.push({ A: tempCodes })
              ans.push({ A: result })
              value = value + result.length
            }
          }
        )
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 1 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ B: tempSubs })
              subcodes.push({ B: tempCodes })

              ans.push({ B: result })
              value = value + result.length
            }
          }
        )
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 2 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ C: tempSubs })
              subcodes.push({ C: tempCodes })

              ans.push({ C: result })
              value = value + result.length
            }
          }
        )
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 2 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ D: tempSubs })
              subcodes.push({ D: tempCodes })

              ans.push({ D: result })
              value = value + result.length
            }
          }
        )
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 3 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ E: tempSubs })
              subcodes.push({ E: tempCodes })

              ans.push({ E: result })
              value = value + result.length
            }
          }
        )
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 3 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ F: tempSubs })
              subcodes.push({ F: tempCodes })
              ans.push({ F: result })
              value = value + result.length
            }
          }
        )
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 4 and sem = 1;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ G: tempSubs })
              subcodes.push({ G: tempCodes })

              ans.push({ G: result })
              value = value + result.length
            }
          }
        )
        db.query(
          `select subcode, subname from printsupply where rollno ='${rno}' and acyear = 4 and sem = 2;`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else if (result.length > 0) {
              let tempSubs = []
              let tempCodes = []
              result.forEach((e) => {
                tempSubs.push(e.subname)
                tempCodes.push(e.subcode)
                mapper[e.subcode] = e.subname
              })
              subnames.push({ H: tempSubs })
              subcodes.push({ H: tempCodes })

              ans.push({ H: result })
              value = value + result.length
            }
            ans.push({ printTab: true })
            ans.unshift({ I: value })
            res.send({
              subnames,
              subcodes,
              mapper,
              printTab: true,
              value,
              ans,
            })
          }
        )
      } else {
        //1 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=1 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ A: tempSubs })
                  subcodes.push({ A: tempCodes })
                  ans.push({ A: result })
                  value = value + result.length
                }
              }
            }
          }
        )

        //1 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=1 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ B: tempSubs })
                  subcodes.push({ B: tempCodes })
                  ans.push({ B: result })
                  value = value + result.length
                }
                // console.log(ans, "1:2")
              }
            }
          }
        )

        //2 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=2 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ C: tempSubs })
                  subcodes.push({ C: tempCodes })
                  ans.push({ C: result })
                  value = value + result.length
                }
              }
            }
          }
        )

        //2 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=2 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ D: tempSubs })
                  subcodes.push({ D: tempCodes })
                  ans.push({ D: result })
                  value = value + result.length
                }
              }
            }
          }
        )

        //3 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=3 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ E: tempSubs })
                  subcodes.push({ E: tempCodes })
                  ans.push({ E: result })
                  value = value + result.length
                }
              }
            }
          }
        )

        //3 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=3 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ F: tempSubs })
                  subcodes.push({ F: tempCodes })
                  ans.push({ F: result })
                  value = value + result.length
                }
              }
            }
          }
        )

        //4 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=4 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ G: tempSubs })
                  subcodes.push({ G: tempCodes })
                  ans.push({ G: result })
                  value = value + result.length
                }
              }
            }
          }
        )

        //4 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidsupply p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.grade ="${gr}" and t.acyear=4 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              res.send({ err: err })
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ H: tempSubs })
                  subcodes.push({ H: tempCodes })
                  ans.push({ H: result })
                  value = value + result.length
                }
                ans.push({ printTab: false })
                // console.log(subcodes, subnames, mapper)
                res.send({
                  subnames,
                  subcodes,
                  mapper,
                  printTab: false,
                  value,
                  ans,
                })
              }
            }
          }
        )
      }
    }
  )
})

////// reval starts here

app.post("/Revalsearch", (req, res) => {
  const rno = req.body.rno
  const exmonth = req.body.exmonth
  const exyear = req.body.exyear
  let subnames = []
  let subcodes = []
  let mapper = {}
  let value = 0
  let k = ""

  db.query(
    `select subname from printreval where rollno = '${rno}';`,
    (_err, result) => {
      if (result.length > 0) {
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 1 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ A: tempSubs })
                  subcodes.push({ A: tempCodes })
                  value = value + result.length
                  k = "A"
                }
              }
            }
          }
        )
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 1 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ B: tempSubs })
                  subcodes.push({ B: tempCodes })
                  value = value + result.length
                  k = "B"
                }
              }
            }
          }
        )
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 2 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ C: tempSubs })
                  subcodes.push({ C: tempCodes })
                  value = value + result.length
                  k = "C"
                }
              }
            }
          }
        )
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 2 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ D: tempSubs })
                  subcodes.push({ D: tempCodes })
                  value = value + result.length
                  k = "D"
                }
              }
            }
          }
        )
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 3 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ E: tempSubs })
                  subcodes.push({ E: tempCodes })
                  value = value + result.length
                  k = "E"
                }
              }
            }
          }
        )
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 3 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ F: tempSubs })
                  subcodes.push({ F: tempCodes })
                  value = value + result.length
                  k = "F"
                }
              }
            }
          }
        )
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 4 and sem = 1;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ G: tempSubs })
                  subcodes.push({ G: tempCodes })
                  value = value + result.length
                  k = "G"
                }
              }
            }
          }
        )
        db.query(
          `select subcode, subname from printreval where rollno ='${rno}' and acyear = 4 and sem = 2;`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ H: tempSubs })
                  subcodes.push({ H: tempCodes })
                  value = value + result.length
                  k = "H"
                }
                res.send({
                  subnames,
                  subcodes,
                  mapper,
                  printTab: true,
                  value: value,
                  reg: k,
                })
              }
            }
          }
        )
      } else {
        //1 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=1 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ A: tempSubs })
                  subcodes.push({ A: tempCodes })
                  value = value + result.length
                  k = "A"
                }
              }
            }
          }
        )

        //1 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=1 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ B: tempSubs })
                  subcodes.push({ B: tempCodes })
                  value = value + result.length
                  k = "B"
                }
              }
            }
          }
        )

        //2 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=2 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ C: tempSubs })
                  subcodes.push({ C: tempCodes })
                  value = value + result.length
                  k = "C"
                }
              }
            }
          }
        )

        //2 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=2 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ D: tempSubs })
                  subcodes.push({ D: tempCodes })
                  value = value + result.length
                  k = "D"
                }
              }
            }
          }
        )

        //3 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=3 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ E: tempSubs })
                  subcodes.push({ E: tempCodes })
                  value = value + result.length
                  k = "E"
                }
              }
            }
          }
        )

        //3 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=3 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ F: tempSubs })
                  subcodes.push({ F: tempCodes })
                  value = value + result.length
                  k = "F"
                }
              }
            }
          }
        )

        //4 sem 1
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=4 and t.sem=1 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ G: tempSubs })
                  subcodes.push({ G: tempCodes })
                  value = value + result.length
                  k = "G"
                }
              }
            }
          }
        )

        //4 sem 2
        db.query(
          `select t.subcode,t.subname from studentinfo t LEFT JOIN paidreevaluation p ON t.subcode=p.subcode and t.rollno=p.rollno where t.rollno="${rno}" and t.exmonth=${exmonth} and t.exyear=${exyear} and t.acyear=4 and t.sem=2 and p.subcode is null and p.rollno is null`,
          (err, result) => {
            if (err) {
              console.log(err)
            } else {
              if (result) {
                if (result.length > 0) {
                  let tempSubs = []
                  let tempCodes = []
                  result.forEach((e) => {
                    tempSubs.push(e.subname)
                    tempCodes.push(e.subcode)
                    mapper[e.subcode] = e.subname
                  })
                  subnames.push({ H: tempSubs })
                  subcodes.push({ H: tempCodes })
                  value = value + result.length
                  k = "H"
                }
                res.send({
                  subnames,
                  subcodes,
                  mapper,
                  printTab: false,
                  value: value,
                  reg: k,
                })
              }
            }
          }
        )
      }
    }
  )
})

////////reval register
app.post("/Registerreval", (req, res) => {
  const rno = req.body.rno
  const A = req.body.A
  const B = req.body.B
  const C = req.body.C
  const D = req.body.D
  const E = req.body.E
  const F = req.body.F
  const G = req.body.G
  const H = req.body.H
  const k = req.body.k
  var ip = req.ip.slice(7)
  A.forEach((element) => {
    let reg = "S"
    if (k === "A") {
      reg = "R"
    } else {
      reg = "S"
    }
    var subname = ""
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",1,1, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })

  B.forEach((element) => {
    var subname = ""
    let reg = "S"
    if (k === "B") {
      reg = "R"
    } else {
      reg = "S"
    }
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",1,2, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })

  C.forEach((element) => {
    var subname = ""
    let reg = "S"
    if (k === "C") {
      reg = "R"
    } else {
      reg = "S"
    }
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",2,1, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })

  D.forEach((element) => {
    var subname = ""
    let reg = "S"
    if (k === "D") {
      reg = "R"
    } else {
      reg = "S"
    }
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",2,2, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })

  E.forEach((element) => {
    var subname = ""
    let reg = "S"
    if (k === "E") {
      reg = "R"
    } else {
      reg = "S"
    }
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",3,1, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })

  F.forEach((element) => {
    var subname = ""
    let reg = "S"
    if (k === "F") {
      reg = "R"
    } else {
      reg = "S"
    }
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",3,2, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })

  G.forEach((element) => {
    var subname = ""
    let reg = "S"
    if (k === "G") {
      reg = "R"
    } else {
      reg = "S"
    }
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",4,1, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })
  H.forEach((element) => {
    var subname = ""
    let reg = "S"
    if (k === "H") {
      reg = "R"
    } else {
      reg = "S"
    }
    console.log("register is:", reg)
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (_err, result) => {
        subname = result[0]["subname"]
        // console.log(subname)

        db.query(
          `insert ignore into paidreevaluation(rollno,subcode,acyear,sem, regdate, subname, stat, user) values("${rno}","${element}",4,2, curdate(), "${subname}","${reg}", (select username from userip where ip = "${ip}"))`,
          (err, _result) => {
            if (err) {
              res.send({ err: err })
            }
          }
        )
      }
    )
  })
  message(rno, " has Reval Registered ${year} - ${sem} for ", ip)
  db.query(`delete from printreval where rollno = '${rno}';`)
  res.send({ registered: true })
})
///////

////  PRINT REVAL
app.post("/printReval", (req, res) => {
  const rno = req.body.rno
  const A = req.body.A
  const B = req.body.B
  const C = req.body.C
  const D = req.body.D
  const E = req.body.E
  const F = req.body.F
  const G = req.body.G
  const H = req.body.H
  const ip = req.ip.slice(7)

  A.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",1,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                console.log(err)
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })
  B.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",1,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  C.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",2,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  D.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",2,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  E.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",3,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  F.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",3,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  G.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",4,1, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })

  H.forEach((element) => {
    db.query(
      `select distinct studentinfo.subname from studentinfo where studentinfo.subcode="${element}"`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        if (result) {
          let subname = result[0]["subname"]
          db.query(
            `insert ignore into printreval(rollno,subcode,subname,acyear,sem, regdate, user) values("${rno}","${element}","${subname}",4,2, curdate(), (select username from userip where ip = "${ip}"));`,
            (err, _result) => {
              if (err) {
                res.send({ err: err })
              }
            }
          )
        }
      }
    )
  })
  message(rno, "took print for reval for ", ip)
  res.send({ done: true })
})

//////LOGIN BOII

app.post("/Login", (req, res) => {
  const username = req.body.username
  const password = req.body.password
  var ip = req.ip.slice(7)
  db.query(
    `select username,password from users where binary username="${username}"`,
    (err, result) => {
      if (err) {
        res.send({ err: err })
        console.log(err)
      } else {
        if (result.length === 1) {
          const hash = md5(password)
          if (hash === result[0]["password"]) {
            db.query(`replace into userip values ("${username}", "${ip}");`)
            messageIp(" has logged in from ", ip)
            res.send({ goahead: true, username: username })
          } else {
            res.send({ goahead: false })
          }
        } else {
          res.send({ goahead: false })
        }
      }
    }
  )
})

app.post(`/deleteprintreval`, (req, res) => {
  const ip = req.ip.slice(7)
  db.query(
    `delete from printreval where rollno = "${req.body.rollno}";`,
    (_err, result) => {
      if (result) {
        message(req.body.rollno, "deleted details from print reval for", ip)
        res.send({ done: true })
      }
    }
  )
})

//////////

///////DOWNLOAD SUPPLY
app.post("/DownloadSupply", (req, res) => {
  const year = parseInt(req.query.year)
  const sem = parseInt(req.query.sem)
  var ip = req.ip.slice(7)

  // console.log(year, sem, typeof year, typeof sem)

  const ws = fs.createWriteStream(`${downLoc}\\Supple Registered.csv`)

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject Name", acyear as Year, sem as Semester, regdate as "Registered Dt", user as 'Registrant' from paidsupply where acyear=${year} and sem=${sem} order by rollno , acyear, sem, subcode`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
          console.log(err)
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("supply", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Supple Registered.csv`,
                "Supple Registered.csv"
              )
            })
        } else res.send()
      }
    )
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject Name", acyear as Year, sem as Semester, regdate as "Registered Dt", user as 'Registrant' from paidsupply order by rollno, acyear, sem, subcode`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
          console.log(err)
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          // console.log(data)
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("supply", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Supple Registered.csv`,
                "Supple Registered.csv"
              )
            })
        } else res.send()
      }
    )
  }
})

app.post("/DownloadSupplyPrint", (req, res) => {
  const year = parseInt(req.query.year)
  const sem = parseInt(req.query.sem)
  var ip = req.ip.slice(7)
  try {
    const ws = fs.createWriteStream(`${downLoc}\\Supple Un-Registered.csv`)

    if (year !== 0 && sem !== 0) {
      db.query(
        `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", regdate as "Registration Dt", user as Registrant from printsupply where acyear=${year} and sem=${sem} order by rollno, subcode`,
        (err, result) => {
          if (err) {
            res.send({ err: err })
          }
          const data = JSON.parse(JSON.stringify(result))
          if (data.length > 0) {
            fastcsv
              .write(data, { headers: true })
              .on("finish", () => {
                downMessage("Supple Un-Registered", ip)
              })
              .pipe(ws)
              .on("close", () => {
                res.download(
                  `${downLoc}\\Supple Un-Registered.csv`,
                  "Supple Un-Registered.csv"
                )
              })
          } else res.send()
        }
      )
    } else if (year === 0 && sem === 0) {
      db.query(
        `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", regdate as "Registration Dt" from printsupply order by rollno, acyear, sem, subcode;`,
        (err, result) => {
          if (err) {
            res.send({ err: err })
          }
          const data = JSON.parse(JSON.stringify(result))
          if (data.length > 0) {
            fastcsv
              .write(data, { headers: true })
              .on("finish", () => {
                downMessage("Supplementary Un-Registered", ip)
              })
              .pipe(ws)
              .on("close", () => {
                res.download(
                  `${downLoc}\\Supple Un-Registered.csv`,
                  "Supple Un-Registered.csv"
                )
              })
          } else res.send()
        }
      )
    } else if (year !== 0 && sem == 0) {
      db.query(
        `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", regdate as "Registration Dt", user as Registrant from printsupply where acyear=${year} order by rollno, subcode`,
        (err, result) => {
          if (err) {
            res.send({ err: err })
          }
          const data = JSON.parse(JSON.stringify(result))
          if (data.length > 0) {
            fastcsv
              .write(data, { headers: true })
              .on("finish", () => {
                downMessage("Supplementary Un-Registered", ip)
              })
              .pipe(ws)
              .on("close", () => {
                res.download(
                  `${downLoc}\\Supple Un-Registered.csv`,
                  "Supple Un-Registered.csv"
                )
              })
          } else res.send()
        }
      )
    }
  } catch (e) {
    console.log(e)
  }
})

//Delete User
app.post("/DelUser", (req, res) => {
  const username = req.body.username
  var ip = req.ip.slice(7)
  // console.log(username)
  db.query(
    `delete from users where username="${username}";`,
    (err, _result) => {
      if (err) {
        // res.send({ err: err })
        console.log(err, "Error")
        res.send({ done: false })
      } else {
        var dt = datetime.create()
        dt = dt.format("Y-m-d  H:M:S")
        db.query(`select username from userip where ip="${ip}"`, (_err, re) => {
          if (re) {
            fs.appendFile(
              "log.txt",
              "\n[" +
                dt +
                ']\t"' +
                re[0]["username"] +
                '" deleted user "' +
                username +
                `" from ` +
                ip,
              function (_er) {}
            )
          }
        })
        res.send({ done: true })
      }
    }
  )
})

////Download supply report

app.post("/DownloadSupplyRep", (req, res) => {
  var ip = req.ip.slice(7)
  // //console.log(year, sem)
  const ws = fs.createWriteStream(`${downLoc}\\Supple Report.csv`)
  db.query(
    `select subcode as Code, subname as Subject,count(*) as Total from paidsupply p group by subcode,subname order by count(*) desc, subcode`,
    (err, result) => {
      if (err) {
        res.send({ err: err })
      }
      const data = JSON.parse(JSON.stringify(result))
      if (data.length > 0) {
        fastcsv
          .write(data, { headers: true })
          .on("finish", () => {
            downMessage("supply report", ip)
          })
          .pipe(ws)
          .on("close", () => {
            res.download(`${downLoc}\\Supple Report.csv`, "Supple Report.csv")
          })
      } else res.send()
    }
  )
})

/////Download reval

app.post("/DownloadReval", (req, res) => {
  const year = parseInt(req.query.year)
  const sem = parseInt(req.query.sem)
  var ip = req.ip.slice(7)
  const ws = fs.createWriteStream(
    `${downLoc}\\Reval Registered ${year} - ${sem}.csv`
  )

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject Name", acyear as Year, sem as Semester, regdate as "Registered Dt", stat as Type, user as Registrant from paidreevaluation where acyear=${year} and sem=${sem} order by rollno, acyear, sem, subcode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("reval", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Registered ${year} - ${sem}.csv`,
                `Reval Registered ${year} - ${sem}.csv`
              )
            })
        } else {
          res.send()
        }
      }
    )
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject Name", acyear as Year, sem as Semester, regdate as "Registered Dt", stat as Type, user as Registrant from paidreevaluation order by rollno, acyear, sem, subcode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("reval", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Registered ${year} - ${sem}.csv`,
                `Reval Registered ${year} - ${sem}.csv`
              )
            })
        } else {
          res.send()
        }
      }
    )
  }
})
////REVAL REPORT

/////Download reval

app.post("/DownloadRevalRep", (req, res) => {
  var ip = req.ip.slice(7)
  const ws = fs.createWriteStream(`${downLoc}\\Reval Report.csv`)
  db.query(
    `select subcode as "Code", subname as "Subject Name",count(*) as Total from paidreevaluation p group by subcode,subname order by Total desc, subcode;`,
    (err, result) => {
      if (err) {
        res.send({ err: err })
      }
      const data = JSON.parse(JSON.stringify(result))
      if (data.length > 0) {
        fastcsv
          .write(data, { headers: true })
          .on("finish", () => {
            downMessage("reval report", ip)
          })
          .pipe(ws)
          .on("close", () => {
            res.download(`${downLoc}\\Reval Report.csv`, "Reval Report.csv")
          })
      } else res.send()
    }
  )
})

app.post("/DownloadRevalPrint", (req, res) => {
  const year = parseInt(req.query.year)
  const sem = parseInt(req.query.sem)
  var ip = req.ip.slice(7)
  const ws = fs.createWriteStream(`${downLoc}\\Reval Un-Registered.csv`)

  //console.log(year, sem)

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", regdate as "Registration Dt", user as Registrant from printreval where acyear=${year} and sem=${sem} order by rollno, subcode`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Un-Registered.csv`,
                "Reval Un-Registered.csv"
              )
            })
        } else res.send()
      }
    )
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", regdate as "Registration Dt" from printreval order by rollno, acyear, sem, subcode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Un-Registered.csv`,
                "Reval Un-Registered.csv"
              )
            })
        } else res.send()
      }
    )
  } else if (year !== 0 && sem == 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", regdate as "Registration Dt", user as Registrant from printreval where acyear=${year} order by rollno, subcode`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Reval Un-Registered.csv`,
                "Reval Un-Registered.csv"
              )
            })
        } else res.send()
      }
    )
  }
})

////////////////TRUNC SUPPLY
app.post("/TruncSupply", (req, res) => {
  console.log("hi")
  var ip = req.ip.slice(7)
  const year = parseInt(req.body.year)
  const sem = parseInt(req.body.sem)

  if (year === 0 && sem === 0) {
    db.query("truncate paidsupply;", (err, result) => {
      if (result) {
        messtrunk(ip, " supply ")
        res.send({ del: true })
      } else if (err) {
        res.send({ del: false })
      }
    })
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `delete from paidsupply where acyear = ${year} and sem = ${sem};`,
      (err, result) => {
        if (result) {
          messtrunk(ip, ` ${year}-${sem} from Paid Supply `)
          res.send({ del: true })
        } else if (err) {
          res.send({ del: false })
        }
      }
    )
  }
})

////////TRUNC REVAL
app.post("/TruncReval", (req, res) => {
  var ip = req.ip.slice(7)
  const year = parseInt(req.body.year)
  const sem = parseInt(req.body.sem)

  if (year === 0 && sem === 0) {
    db.query("truncate paidreevaluation;", (err, result) => {
      if (result) {
        messtrunk(ip, " Reval ")
        res.send({ del: true })
      } else if (err) {
        res.send({ del: false })
      }
    })
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `delete from paidreevaluation where acyear = ${year} and sem = ${sem};`,
      (err, result) => {
        if (result) {
          messtrunk(ip, ` ${year}-${sem} from Paid Reval `)
          res.send({ del: true })
        } else if (err) {
          res.send({ del: false })
        }
      }
    )
  }
})

////CBT SEARCH
app.post("/CbtSearch", (req, res) => {
  // console.log(req.body)
  const acyear = req.body.acyear
  const sem = req.body.sem
  const reg = req.body.reg
  const branch = req.body.branch
  const ans = []
  const names = []
  const mapper = {}
  const rollno = req.body.rno
  const ansObj = {}

  db.query(
    `select * from printcbt where rollno='${rollno}' and acyear= ${acyear} and sem = ${sem};`,
    (err, result) => {
      if (result.length > 0) {
        db.query(
          `select subcode from printcbt where rollno="${rollno}";`,
          (err, result) => {
            if (result) {
              result.forEach((e) => {
                ans.push(e.subcode)
              })
            }
          }
        )
        db.query(
          `select subcode, subname from printcbt where rollno = "${rollno}";`,
          (err, result) => {
            if (result) {
              const out = JSON.parse(JSON.stringify(result))
              result.forEach((e) => {
                mapper[e["subcode"]] = e["subname"]
                names.push(e.subname)
              })
              // console.log("hehe")
              res.send({ out, ans, mapper, names, print: true })
            }
          }
        )
      } else {
        db.query(
          `select t.subcode from cbtsubjects t Left join paidcbt p on t.subcode=p.subcode and p.rollno="${rollno}" where t.acyear=${acyear} and t.sem=${sem} and p.subcode is null and t.regyear=${reg} and t.branch="${branch}";`,
          (err, result) => {
            if (err) {
              console.log("errr" + err)
              res.status(500).end("err")
            }
            if (result) {
              result.forEach((e) => {
                ans.push(e.subcode)
              })
            }
          }
        )
        db.query(
          `select t.subcode,t.subname from cbtsubjects t Left join paidcbt p on t.subcode=p.subcode and p.rollno="${req.body.rno}" where t.acyear=${acyear} and t.sem=${sem} and p.subcode is null and t.regyear=${reg} and t.branch="${branch}";`,
          (err, result) => {
            if (err) {
              console.log("errr" + err)
              res.status(500).end("err")
            }
            if (result) {
              const out = JSON.parse(JSON.stringify(result))
              result.forEach((e) => {
                mapper[e["subcode"]] = e["subname"]
                ansObj[
                  ((subcode = `${e["subcode"]}`), (subname = `${e["subname"]}`))
                ]
                names.push(e.subname)
              })
              // console.log("hehe")
              res.send({ out, ans, mapper, names, ansObj, print: false })
              // res.send({ out })
            }
          }
        )
      }
    }
  )
})

app.post(`/printCbt`, (req, res) => {
  const acyear = req.body.acyear
  const sem = req.body.sem
  const subcode = req.body.subcode
  const rno = req.body.rno
  const subname = req.body.subname
  const branch = req.body.branch
  var ip = req.ip.slice(7)
  var count = 0

  subcode.forEach((e) => {
    db.query(
      `insert ignore into printcbt(rollno, subcode, acyear, sem, subname, regdate, branch, user)values("${rno}","${e}","${acyear}","${sem}","${subname[count]}", curdate(),"${branch}", (select username from userip where ip = "${ip}"));`,
      (err, _result) => {
        if (err) {
          res.send({ err: true })
          console.log(err)
        }
      }
    )
    count++
  })
  message(rno, "took print for CBT for ", ip)
  res.send({ done: true })
})

////CBT REGISTER

app.post("/CbtRegister", (req, res) => {
  const acyear = req.body.acyear
  const sem = req.body.sem
  const subcode = req.body.subcode
  const rno = req.body.rno
  const subname = req.body.subname
  const branch = req.body.branch
  var ip = req.ip.slice(7)
  let count = 0

  subcode.forEach((e) => {
    db.query(
      `insert ignore into paidcbt(rollno, subcode, acyear, sem, subname, regdate, branch, user)values("${rno}","${e}","${acyear}","${sem}","${subname[count]}", curdate(),"${branch}", (select username from userip where ip = "${ip}"))`,
      (err) => {
        if (err) {
          res.status(500).send("errrr" + err)
        }
      }
    )
    count++
  })

  db.query(`delete from printcbt where rollno = "${rno}";`)

  message(rno, "has CBT Registered for ", ip)
  res.send({ succ: true })
})

////TRUNCATE PAID CBT
app.post("/TruncCBT", (req, res) => {
  let ip = req.ip.slice(7)
  const year = parseInt(req.body.year)
  const sem = parseInt(req.body.sem)

  if (year === 0 && sem === 0) {
    db.query("truncate paidcbt;", (err, result) => {
      if (err) {
        res.status(500).send("errrr" + err)
      }
      if (result) {
        db.query("truncate cbtsubjects", (er, re) => {
          if (er) {
            res.status(500).send("errrr" + err)
          }
          if (re) {
            messtrunk(ip, ` Paid CBT `)
            res.send({ del: true })
          }
        })
      }
    })
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `delete from paidcbt where acyear = ${year} and sem = ${sem};`,
      (err, result) => {
        if (result) {
          messtrunk(ip, ` ${year}-${sem} from Paid CBT `)
          res.send({ del: true })
        } else if (err) {
          res.send({ del: false })
        }
      }
    )
  }
})

////DOWNLOAD paid cbt
app.post("/DownloadCBT", (req, res) => {
  const year = parseInt(req.query.year)
  const sem = parseInt(req.query.sem)
  var ip = req.ip.slice(7)
  const ws = fs.createWriteStream(`${downLoc}\\CBT Registered.csv`)

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", branch as "Branch", regdate as "Registration Dt", user as Registrant from paidcbt where acyear=${year} and sem=${sem} order by rollno, subcode`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Registered.csv`,
                "CBT Registered.csv"
              )
            })
        } else res.send()
      }
    )
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", branch as "Branch", regdate as "Registration Dt" from paidcbt order by rollno, acyear, sem, subcode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Registered.csv`,
                "CBT Registered.csv"
              )
            })
        } else res.send()
      }
    )
  }
})

app.post("/DownloadCBTPrint", (req, res) => {
  const year = parseInt(req.query.year)
  const sem = parseInt(req.query.sem)
  var ip = req.ip.slice(7)
  const ws = fs.createWriteStream(`${downLoc}\\CBT Un-Registered.csv`)

  //console.log(year, sem)

  if (year !== 0 && sem !== 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", branch as "Branch", regdate as "Registration Dt", user as Registrant from printcbt where acyear=${year} and sem=${sem} order by rollno, subcode`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Un-Registered.csv`,
                "CBT Un-Registered.csv"
              )
            })
        } else res.send()
      }
    )
  } else if (year === 0 && sem === 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", branch as "Branch", regdate as "Registration Dt" from printcbt order by rollno, acyear, sem, subcode;`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Un-Registered.csv`,
                "CBT Un-Registered.csv"
              )
            })
        } else res.send()
      }
    )
  } else if (year !== 0 && sem == 0) {
    db.query(
      `select rollno as "Ht Number", subcode as "Code", subname as "Subject", acyear as "Year", sem as "Semester", branch as "Branch", regdate as "Registration Dt", user as Registrant from printcbt where acyear=${year} order by rollno, subcode`,
      (err, result) => {
        if (err) {
          res.send({ err: err })
        }
        const data = JSON.parse(JSON.stringify(result))
        if (data.length > 0) {
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              downMessage("CBT Print", ip)
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\CBT Un-Registered.csv`,
                "CBT Un-Registered.csv"
              )
            })
        } else res.send()
      }
    )
  }
})
/////cbt report

app.post("/DownloadCBTRep", (req, res) => {
  const year = req.query.year
  const sem = req.query.sem
  var ip = req.ip.slice(7)
  // //console.log(year, sem)
  // var table = req.body.table
  const ws = fs.createWriteStream(`${downLoc}\\CBT Report.csv`)
  db.query(
    `select branch as Branch,subcode as Code,subname as Subject,count(*) as Total from paidcbt group by branch, subcode, subname, acyear,sem order by Total desc, subcode;`,
    (err, result) => {
      if (err) {
        res.send({ err: err })
      }
      const data = JSON.parse(JSON.stringify(result))
      if (data.length > 0) {
        fastcsv
          .write(data, { headers: true })
          .on("finish", () => {
            downMessage("CBT report", ip)
          })
          .pipe(ws)
          .on("close", () => {
            res.download(`${downLoc}\\CBT Report.csv`, "CBT Report.csv")
          })
      } else res.send()
    }
  )
})

////upload cbt
app.post("/UpdateCBT", (req, res) => {
  const acyear = req.body.acyear
  const sem = req.body.sem
  const regyear = req.body.exyear
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let filesRead = 0
  let totalFiles = 0
  let flag = false
  let erfiles = []
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ err: true })
      console.log("error" + err)
    } else {
      totalFiles = files.length
    }
  })
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err)
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            // console.log(Object.keys(s[1], "SSS"))
            let subcode = Object.keys(s[0])[0]
            let subname = Object.keys(s[0])[1]
            let branch = Object.keys(s[0])[2]
            let count = 0
            // res.send({ done: true })
            console.log("Uploading ", fname)
            s.forEach((e) => {
              // console.log(subcode, subname, grade, e["rollno"], e[grade])
              if (typeof subname === "string" && typeof subcode === "string") {
                db.query(
                  `insert ignore into cbtsubjects(subcode,subname,acyear,sem,regyear,branch) values ("${e[subcode]}","${e[subname]}",${acyear},${sem},${regyear},"${e[branch]}")`,
                  (err, result) => {
                    if (err) {
                      console.log(err)
                      erfiles.push(fname)
                    }
                    if (result) {
                      count++
                      if (count === s.length) {
                        filesRead++
                        upMessage(fname, ip, "CBT ")
                        console.log(filesRead, " uploaded", fname)
                        if (filesRead === totalFiles) {
                          console.log("Error files", erfiles)
                          res.send({
                            done: true,
                            tot: filesRead,
                            ertot: erfiles.length,
                            erf: erfiles,
                          })
                        }
                      }
                    }
                  }
                )
              } else {
                flag = true
              }
            })
            if (flag) {
              erfiles.push(fname)
              flag = false
            }
          })
      })
    }
  })
  // console.log("Error files", erfiles)
})
///fetch cbtbranches
app.post("/Branch", (_req, res) => {
  let branch = []
  db.query(
    "select distinct(branch) from cbtsubjects order by branch asc;",
    (err, result) => {
      if (result) {
        result.forEach((e) => {
          branch.push(e["branch"])
        })
        res.send(branch)
      } else if (err) {
        res.status(500).send(err)
        console.log("eerr", err)
      }
    }
  )
})

////////Add User

app.post("/AddUser", (req, res) => {
  const username = req.body.username
  const password = md5(req.body.password)
  const pass = req.body.password
  var ip = req.ip.slice(7)

  db.query(
    `insert into users(username,password) values("${username}","${password}")`,
    (err, result) => {
      if (err) {
        res.send({ Valid: false })
      }
      if (result) {
        var dt = datetime.create()
        dt = dt.format("Y-m-d  H:M:S")
        db.query(`select username from userip where ip="${ip}"`, (_err, re) => {
          if (re) {
            fs.appendFile(
              "log.txt",
              "\n[" +
                dt +
                ']\t"' +
                re[0]["username"] +
                `" added new user ` +
                username +
                " " +
                pass +
                " from " +
                ip,
              function (_er) {}
            )
          }
        })
        res.send({ Valid: true })
      }
    }
  )
})

//upload costs
app.post("/Costs", (req, res) => {
  ip = req.ip.slice(7)
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
  ]
  values.map((element) => {
    db.query(
      `update costs set ${element.col} = ${element.val} where 1;`,
      (err, result) => {
        if (err) console.log(err)
        else {
          // console.log(result);
          result = JSON.parse(JSON.stringify(result))
          // console.log(result);
        }
      }
    )
  })
  messageIp("updated costs ", ip)
  res.send({ done: true })
})

app.post("/Fines", (req, res) => {
  const no_fine = req.body.nofinedt
  const values = [
    {
      fineName: "fine_1",
      cost: req.body.fine_1,
      dateName: "fine_1dt",
      date: req.body.fine_1dt,
    },
    {
      fineName: "fine_2",
      cost: req.body.fine_2,
      dateName: "fine_2dt",
      date: req.body.fine_2dt,
    },
    {
      fineName: "fine_3",
      cost: req.body.fine_3,
      dateName: "fine_3dt",
      date: req.body.fine_3dt,
    },
  ]

  db.query(`update costs set no_fine = "${no_fine}";`)
  values.map((element) => {
    db.query(`update costs set ${element.fineName} = ${element.cost};`)
    db.query(`update costs set ${element.dateName} = "${element.date}";`)
  })

  messageIp("updated fines ", req.ip.slice(7))
  res.send({ done: true })
})

//DelEntry

app.post("/DelEntry", (req, res) => {
  const rollno = req.body.rollno
  const table = req.body.table
  let flag = true
  var ip = req.ip.slice(7)
  const subcodes = req.body.subcodes
  subcodes.forEach((e) => {
    db.query(
      `delete from ${table} where rollno="${rollno}" and subcode="${e}"`,
      (err, result) => {
        if (err) {
          res.send({ delete: false })
          flag = false
        }
        if (result) {
          message(rollno, `has deleted paid entries from ${table} `, ip)
        }
      }
    )
  })
  if (flag) {
    res.send({ delete: true })
  }
})

//get costs
app.post("/getCosts", (_req, res) => {
  db.query(`select * from costs;`, (err, result) => {
    try {
      if (err) {
        console.log("Error!", err)
        res.send({ error: true })
      } else if (result) {
        result = JSON.parse(JSON.stringify(result))
        res.send({ arr: result })
      }
    } catch (e) {
      console.log(e)
    }
  })
})

const messageEx = async () => {
  var dt = datetime.create()
  dt = dt.format("Y-m-d  H:M:S")
  console.log("Good-bye!")
  fs.appendFile(
    "log.txt",
    "\n[" + dt + "]\tServer Stopped!!",
    function (_err) {}
  )
  await new Promise((resolve) => setTimeout(resolve, 1000))
  process.exit()
}

//del entry getpaid data
app.post("/GetPaid", (req, res) => {
  const acyear = parseInt(req.body.year)
  const sem = parseInt(req.body.sem)
  const dict = {}

  let setsem = "sem"
  if (req.body.table === "paidcbt") {
    setsem = "sem"
  }
  db.query(
    `select * from ${req.body.table} where rollno="${req.body.rollno}" and acyear=${acyear} and ${setsem}=${sem}`,
    (err, result) => {
      if (err) {
        console.log(err)
        res.send({ ahead: false })
      } else if (result) {
        let subcodes = []
        let subnames = []
        for (i in result) {
          const code = result[i].subcode
          dict[`${code}`] = result[i].subname
          subcodes.push(result[i].subcode)
          subnames.push(result[i].subname)
        }
        res.send({
          ahead: true,
          subnames: subnames,
          subcodes: subcodes,
          K: subcodes.length,
        })
      }
    }
  )
})

////  STUDENT INFO RETRIEVE
app.post("/getInfo", (req, res) => {
  const rno = req.body.rno
  const year = parseInt(req.body.year)
  const sem = parseInt(req.body.sem)
  const table = req.body.table
  const printSubs = []

  if (year === 0 && sem === 0) {
    db.query(
      `select * from ${table} where rollno="${rno}" order by acyear asc, sem asc, subcode asc;`,
      (err, result) => {
        try {
          if (err) {
            console.log("Error!", err)
          } else if (result) {
            let fCount = 0
            const data = JSON.parse(JSON.stringify(result))
            // console.log(data)
            if (table === "studentinfo") {
              // console.log("inside fCount if")
              data.map((value) => {
                if (value.grade === "F" || value.grade.toLowerCase() === "ab")
                  fCount++
              })
            }

            if (
              table === "printcbt" ||
              table === "printsupply" ||
              table === "printreval"
            ) {
              data.forEach((e) => {
                printSubs.push(e["subname"])
              })
            }
            // console.log(printSubs, fCount)
            if (data.length > 0)
              res.send({ info: data, printSubs, fCount: fCount })
            else res.send({ miss: true })
          }
        } catch (e) {
          console.log(e)
        }
      }
    )
  } else if (year !== 0 && sem === 0) {
    db.query(
      `select * from ${table} where rollno="${rno}" and acyear=${year} order by sem asc, subcode asc;`,
      (err, result) => {
        try {
          if (err) {
            console.log("Error!", err)
          } else if (result) {
            let fCount = 0
            const data = JSON.parse(JSON.stringify(result))
            data.map((value) => {
              if (value.grade === "F" || value.grade.toLowerCase() === "ab")
                fCount++
            })
            if (data !== 0) res.send({ info: data, fCount: fCount })
            else res.send({ miss: true })
          }
        } catch (e) {
          console.log(e)
        }
      }
    )
  } else if (year !== 0 && sem !== 0) {
    db.query(
      `select * from ${table} where rollno="${rno}" and acyear=${year} and sem=${sem} order by subcode asc;`,
      (err, result) => {
        try {
          if (err) {
            console.log("Error!", err)
          } else if (result) {
            let fCount = 0
            const data = JSON.parse(JSON.stringify(result))
            data.map((value) => {
              if (value.grade === "F" || value.grade.toLowerCase() === "ab")
                fCount++
            })
            if (data !== 0) res.send({ info: data, fCount: fCount })
            else res.send({ miss: true })
          }
        } catch (e) {
          console.log(e)
        }
      }
    )
  } else if (year === 0 && sem !== 0) {
    res.send({ miss: true })
  }
})

////  DOWNLOAD STUDENT INFO
app.post("/downInfo", (req, res) => {
  const rno = req.query.rno
  const ip = req.ip.slice(7)
  const table = req.query.table
  const ws = fs.createWriteStream(`${downLoc}\\Student Details\\${rno}.csv`)
  db.query(
    `select rollno as "Roll Number", subcode as Code, subname as Subject, grade as Grade, acyear as Year, sem as Semester, exyear as "Exam Year", exmonth as "Exam Month", gradepoint as Grade, credits as Credits, orcredits as "Subject Credits" from ${table} where rollno="${rno}" order by acyear asc, sem asc, subcode asc;`,
    (err, result) => {
      try {
        if (err) {
          console.log("Error!", err)
        } else if (result) {
          const data = JSON.parse(JSON.stringify(result))
          fastcsv
            .write(data, { headers: true })
            .on("finish", () => {
              message(
                rno + " (via Manage Database)",
                "has downloaded details of ",
                ip
              )
            })
            .pipe(ws)
            .on("close", () => {
              res.download(
                `${downLoc}\\Student Details\\${rno}.csv`,
                `${rno}.csv`
              )
            })

          res.send({ info: arr })
        }
      } catch (e) {
        console.log(e)
      }
    }
  )
})

//  EDIT INFO (studentinfo)
app.post(`/editinfo`, (req, res) => {
  let subcode = req.body.subcode
  let subname = req.body.subname
  let grade = req.body.grade
  let year = req.body.year
  let sem = req.body.sem
  let exyear = req.body.exyear
  let exmonth = req.body.exmonth
  let rollno = req.body.rno
  let table = req.body.table
  let refcode = req.body.refcode

  if (table === "studentinfo") {
    db.query(
      `update studentinfo set subcode='${subcode}', subname='${subname}', grade='${grade}', acyear=${year}, sem=${sem}, exyear=${exyear}, exmonth=${exmonth} where rollno='${rollno}' and subcode='${refcode}';`,
      (err, result) => {
        if (result) {
          message(
            `${rollno} - ${refcode} details in ${table}`,
            `edited `,
            req.ip.slice(7)
          )
          res.send({ done: true })
        } else {
          console.log(err)
          res.send({ err: true })
        }
      }
    )
  } else {
    db.query(
      `update ${table} set subcode='${subcode}', subname='${subname}', acyear=${year}, sem=${sem} where rollno='${rollno}' and subcode='${refcode}';`,
      (err, result) => {
        if (result) {
          message(
            `${rollno} - ${refcode} details in ${table}`,
            `edited `,
            req.ip.slice(7)
          )
          res.send({ done: true })
        } else {
          console.log(err)
          res.send({ err: true })
        }
      }
    )
  }
})

app.post(`/deleteinfo`, (req, res) => {
  let rollno = req.body.rno
  let subcode = req.body.subcode
  let table = req.body.table

  db.query(
    `delete from ${table} where rollno= "${rollno}" and subcode= "${subcode}";`,
    (_err, result) => {
      if (result) {
        message(rollno, `deleted details from ${table} for `, req.ip.slice(7))
        res.send({ done: true })
      } else {
        res.send({ err: true })
      }
    }
  )
})

//  ADD INFO
app.post(`/addinfo`, (req, res) => {
  let rollno = req.body.rollno
  let subcode = req.body.subcode
  let subname = req.body.subname
  let grade = req.body.grade
  let year = req.body.year
  let sem = req.body.sem
  let exyear = req.body.exyear
  let exmonth = req.body.exmonth
  let table = req.body.table

  // console.log(
  //   rollno,
  //   subcode,
  //   subname,
  //   grade,
  //   year,
  //   sem,
  //   exyear,
  //   exmonth,
  //   table
  // )

  if (table === "studentinfo") {
    db.query(
      `insert into studentinfo (rollno, subcode, subname, grade, acyear, sem, exyear, exmonth) values ("${rollno}", "${subcode}", "${subname}", "${grade}", ${year}, ${sem}, "${exyear}", "${exmonth}");`,
      (err, result) => {
        if (result) {
          message(rollno, "edited details of studentinfo for ", req.ip.slice(7))
          res.send({ done: true })
        } else if (err.errno === 1054) {
          console.log(err)
          res.send({ wrongvalue: true })
        } else if (err.errno === 1062) {
          console.log(err)
          res.send({ dupe: true })
        }
      }
    )
  } else {
    db.query(
      `insert into ${table} (rollno, subcode, subname, acyear, sem, regdate) values ('${rollno}', '${subcode}', '${subname}', ${year}, ${sem}, curdate());`,
      (err, result) => {
        if (result) {
          message(rollno, `edited details of ${table} for`, req.ip.slice(7))
          res.send({ done: true })
        } else if (err.errno === 1054) {
          console.log(err, "1")
          res.send({ wrongvalue: true })
        } else if (err.errno === 1062) {
          console.log(err, "1")
          res.send({ dupe: true })
        }
      }
    )
  }
})

///////////////////
// view Gpa

app.post(`/ViewData`, (req, res) => {
  let rollno = req.body.rollno
  let year = req.body.year
  let sem = req.body.sem
  console.log(rollno, year, sem)
  res.send({ view: true })
})
app.post(`/uploadcreds`, (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let filesRead = 0
  let totalFiles = 0
  let flag = false
  let erfiles = []
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("error" + err)
    } else {
      totalFiles = files.length
      console.log("Supply files found " + totalFiles)
    }
  })
  fs.readdir(loc, (err, files) => {
    if (err) {
      console.log("errrrr" + err)
    } else {
      files.forEach((fname) => {
        csvtojson()
          .fromFile(`${loc}\\${fname}`)
          .then((s) => {
            // console.log(Object.keys(s[1], "SSS"))
            let subcode = Object.keys(s[0])[0]
            let credit = Object.keys(s[0])[1]
            let count = 0
            s.forEach((e) => {
              if (typeof subcode === "string" && typeof credit === "string") {
                // console.log("Inside if");
                if (e[credit] !== "") {
                  db.query(
                    // `replace into studentinfo (rollno, grade, exyear, exmonth, subcode, subname, acyear, sem) values("${e["rollno"]}",${e[credit]},${exyear}, ${exmonth},"${subcode}","${subname}",${acyear},${sem});`,
                    `replace into subcred(subcode,credits) values("${
                      e[subcode]
                    }",${parseInt(e[credit])});`,
                    (err, _result) => {
                      try {
                        if (err) {
                          console.log(err, "Errorrrrrr!!!!")
                          erfiles.push(fname)
                        }
                        count++
                        if (count === s.length) {
                          filesRead++
                          upMessage(fname, ip, "credits ")
                          console.log(filesRead, " uploaded", fname)
                          if (filesRead === totalFiles) {
                            console.log("Error files", erfiles)
                            db.query(
                              `update studentinfo stu inner join grades g on stu.grade=g.grade set stu.gradepoint=g.gradepoint;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err)
                                } else if (result) {
                                  console.log(result)
                                }
                              }
                            )
                            db.query(
                              `update studentinfo stu inner join subcred g on stu.subcode=g.subcode set stu.credits=stu.gradepoint*g.credits;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err)
                                } else if (result) {
                                  console.log(result)
                                }
                              }
                            )
                            db.query(
                              `update studentinfo stu inner join subcred g on stu.subcode=g.subcode set stu.ocredits=g.credits;`,
                              (err, result) => {
                                if (err) {
                                  console.log(err)
                                } else if (result) {
                                  console.log(result)
                                }
                              }
                            )
                            messageIp("updated credits ", req.ip.slice(7))
                            res.send({
                              done: true,
                              tot: filesRead,
                              ertot: erfiles.length,
                              erf: erfiles,
                            })
                          }
                        }
                      } catch (e) {
                        console.log(e)
                      }
                    }
                  )
                } else {
                  count++
                }
              } else {
                flag = true
              }
            })
          })
      })
      if (flag) {
        erfiles.push(fname)
        flag = false
      }
    }
  })
})

//  DELETING PRINT ENTRIES
app.post(`/deleteprintcbt`, (req, res) => {
  const rollno = req.body.rollno

  db.query(
    `delete from printcbt where rollno = "${rollno}";`,
    (err, result) => {
      if (err) {
        res.send({ err: true })
      } else if (result) {
        message(rollno, "deleted values from print CBT for ", req.ip.slice(7))
        res.send({ done: true })
      }
    }
  )
})

app.post(`/deleteprintsupply`, (req, res) => {
  const rollno = req.body.rollno

  db.query(
    `delete from printsupply where rollno = "${rollno}";`,
    (err, result) => {
      if (err) {
        res.send({ err: true })
      } else if (result) {
        message(
          rollno,
          "deleted values from print supple for ",
          req.ip.slice(7)
        )
        res.send({ done: true })
      }
    }
  )
})

app.post("/deleyeprintreval", (req, res) => {
  const rollno = req.body.rollno

  db.query(
    `delete from printreval where rollno = "${rollno}";`,
    (err, result) => {
      if (err) {
        res.send({ err: true })
      } else if (result) {
        message(rollno, "deleted values from print reval for ", req.ip.slice(7))
        res.send({ done: true })
      }
    }
  )
})
/////////////////
///////////////

app.get("/subcode-count", async (_, res) => {
  console.clear()
  let count = 0
  let codes = []
  let errCount = 0
  db.query(`SELECT DISTINCT subcode FROM studentinfo;`, (_err, result) => {
    result.forEach((code) => {
      codes.push(code.subcode)
    })
    codes.map((value) => {
      db.query(
        `SELECT DISTINCT subcode, subname FROM studentinfo WHERE (SELECT COUNT(distinct subname) FROM studentinfo WHERE subcode = "${value}") >= 2 AND subcode = "${value}";`,
        (_err, result_1) => {
          count++
          if (result_1.length > 0) {
            errCount++
            result_1.map((value) => {
              console.log(value.subcode, value.subname)
            })
            console.log(` `)
          }
          if (count === codes.length) {
            res.send({ done: true })
            console.log(
              `${errCount} codes have multiple names\n=======================  XXX  =======================`
            )
          }
        }
      )
    })
  })
})

app.post("/codeNames", (req, res) => {
  const loc = req.body.loc.replaceAll("\\", "\\\\")
  let count = 0
  var ip = req.ip.slice(7)

  fs.readdir(loc, (err, files) => {
    if (err) {
      res.send({ fileErr: true })
      // console.log(err)
    } else {
      files.forEach((fname) => {
        if (fname === "code-names.csv") {
          csvtojson()
            .fromFile(`${loc}\\${fname}`)
            .then((table) => {
              let code = Object.keys(table[0])[0]
              let name = Object.keys(table[0])[1]

              table.forEach((value) => {
                db.query(
                  `INSERT IGNORE INTO codenames VALUES ("${value[code]}", "${value[name]}");`,
                  (er, result) => {
                    if (result) {
                      count++
                      if (count === table.length) {
                        messageIp("uploaded code names ", req.ip.slice(7))
                        res.send({ done: true })
                      }
                    } else if (er) {
                      // console.log(er)
                      res.send({ upErr: true })
                    }
                  }
                )
              })
            })
        }
      })
    }
  })
})

app.listen(6969, () => {
  console.log("Server Started!!")
  var dt = datetime.create()
  dt = dt.format("Y-m-d  H:M:S")
  fs.appendFile(
    "log.txt",
    "\n[" + dt + "]\tServer Started!!",
    function (_err) {}
  )

  process.on("SIGINT", messageEx.bind())
})
