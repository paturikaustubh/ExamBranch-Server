CREATE DATABASE practice;
GRANT ALL PRIVILEGES ON practice.* TO "root"@"localhost";
FLUSH PRIVILEGES;
USE practice;

CREATE TABLE cbtSubjects (
    subCode VARCHAR(20),
    subName VARCHAR(20),
    branch VARCHAR(15),
    acYear INT,
    sem INT,
    regYear INT,
    PRIMARY KEY (subCode , subName , branch)
);

CREATE TABLE codeNames (
    subCode VARCHAR(20),
    subName VARCHAR(20),
    PRIMARY KEY (subCode)
);

CREATE TABLE costs (
    sbc INT DEFAULT 0,
    sac INT DEFAULT 0,
    sfc INT DEFAULT 0,
    rev INT DEFAULT 0,
    cbc INT DEFAULT 0,
    cac INT DEFAULT 0,
    cfc INT DEFAULT 0,
    fine_1 INT DEFAULT 0,
    fine_2 INT DEFAULT 0,
    fine_3 INT DEFAULT 0,
    fine_1Dt VARCHAR(100) DEFAULT 'N/A',
    fine_2Dt VARCHAR(100) DEFAULT 'N/A',
    fine_3Dt VARCHAR(100) DEFAULT 'N/A',
    no_fine VARCHAR(100) DEFAULT 'N/A'
);

CREATE TABLE grades (
    grade VARCHAR(3),
    gradePoint INT,
    PRIMARY KEY (grade)
);

CREATE TABLE paidCBT (
    rollNo VARCHAR(15),
    subCode VARCHAR(15),
    subName VARCHAR(15),
    acYear INT,
    sem INT,
    regDate VARCHAR(12),
    branch VARCHAR(12),
    user VARCHAR(12),
    PRIMARY KEY (rollno , subCode)
);

CREATE TABLE paidReEvaluation (
    rollNo VARCHAR(15),
    subCode VARCHAR(15),
    subName VARCHAR(15),
    acYear INT,
    sem INT,
    regDate VARCHAR(12),
    stat CHAR(1),
    user VARCHAR(20),
    PRIMARY KEY (rollno , subCode)
);

CREATE TABLE paidSupply (
    rollNo VARCHAR(15),
    subCode VARCHAR(15),
    subName VARCHAR(15),
    acYear INT,
    sem INT,
    regDate VARCHAR(12),
    user VARCHAR(20),
    PRIMARY KEY (rollNo , subCode)
);

CREATE TABLE printSupply (
    rollNo VARCHAR(15),
    subCode VARCHAR(15),
    subName VARCHAR(15),
    acYear INT,
    sem INT,
    regDate VARCHAR(12),
    user VARCHAR(20),
    PRIMARY KEY (rollNo , subCode)
);

CREATE TABLE printReval (
    rollNo VARCHAR(15),
    subCode VARCHAR(15),
    subName VARCHAR(15),
    acYear INT,
    sem INT,
    regDate VARCHAR(12),
    stat CHAR(1),
    user VARCHAR(20),
    PRIMARY KEY (rollNo , subCode)
);

CREATE TABLE printCBT (
    rollNo VARCHAR(15),
    subCode VARCHAR(15),
    subName VARCHAR(15),
    acYear INT,
    sem INT,
    regDate VARCHAR(12),
    bracha VARCHAR(12),
    user VARCHAR(20),
    PRIMARY KEY (rollNo , subCode)
);

CREATE TABLE studentInfo (rollNo VARCHAR(15), subCode VARCHAR(15), subName VARCHAR(15), grade VARCHAR(3), acYear INT, sem INT, exYear INT, exMonth INT, gradePoint INT, credits INT, orCredits INT, json JSON, PRIMARY KEY (rollNo, subCode));

CREATE TABLE subCred (
    subCodr VARCHAR(15),
    credits INT
);

CREATE TABLE userIp (
    userName VARCHAR(15) PRIMARY KEY,
    ip VARCHAR(20)
);

CREATE TABLE users (
    userName VARCHAR(15) PRIMARY KEY,
    password VARCHAR(50)
);

INSERT INTO users VALUES ("admin", "6d6587811555580ab1b4f4c440dd612f");

DESC costs;

INSERT INTO costs VALUES (900, 200, 1800, 1000, 200, 100, 500, 200, 300, 400, "12/12/2022", "12/12/2022", "12/12/2022", "12/12/2022");
