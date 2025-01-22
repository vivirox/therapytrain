--
--
-- View.io MySQL database setup script
--
--

DROP SCHEMA IF EXISTS `view`;

CREATE SCHEMA IF NOT EXISTS `view`;

USE view;

-- MySQL dump 10.13  Distrib 8.0.37, for Win64 (x86_64)
--
-- Host: localhost    Database: view
-- ------------------------------------------------------
-- Server version	8.0.37

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accesscontrolentries`
--

DROP TABLE IF EXISTS `accesscontrolentries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accesscontrolentries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) NOT NULL,
  `objectguid` varchar(64) DEFAULT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `userguid` varchar(64) DEFAULT NULL,
  `canonicaluser` varchar(64) DEFAULT NULL,
  `enableread` tinyint NOT NULL,
  `enablereadacp` tinyint NOT NULL,
  `enablewrite` tinyint NOT NULL,
  `enablewriteacp` tinyint NOT NULL,
  `enablefullcontrol` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accesscontrolentries`
--

LOCK TABLES `accesscontrolentries` WRITE;
/*!40000 ALTER TABLE `accesscontrolentries` DISABLE KEYS */;
INSERT INTO `accesscontrolentries` VALUES (1,'default','default','example-data-bucket',NULL,'default','default','',1,1,1,1,1,'2024-07-10 05:10:35');
/*!40000 ALTER TABLE `accesscontrolentries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts`
--
DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `addldata` varchar(256) DEFAULT NULL,
  `isprotected` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES (1,'default','My View account',NULL,1,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `accountguid` varchar(64) NOT NULL,
  `firstname` varchar(64) NOT NULL,
  `lastname` varchar(64) NOT NULL,
  `email` varchar(64) NOT NULL,
  `passwordsha256` varchar(64) NOT NULL,
  `telephone` varchar(64) NULL,
  `addldata` varchar(256) DEFAULT NULL,
  `active` tinyint NOT NULL,
  `isprotected` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'default','default','System','Administrator','admin@view.io','e75255193871e245472533552fe45dfda25768d26e9eb92507e75263e90c6a48',NULL,'Initial password is viewadmin',1,1,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blobs`
--

DROP TABLE IF EXISTS `blobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blobs` (
  `blobid` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `contenttype` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(256) DEFAULT NULL,
  `url` varchar(256) DEFAULT NULL,
  `length` int NOT NULL,
  `refobjtype` varchar(64) NOT NULL,
  `refobjguid` varchar(64) NOT NULL,
  `md5` varchar(32) NOT NULL,
  `sha1` varchar(40) NOT NULL,
  `sha256` varchar(64) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`blobid`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `blobs`
--

LOCK TABLES `blobs` WRITE;
/*!40000 ALTER TABLE `blobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `blobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `buckets`
--

DROP TABLE IF EXISTS `buckets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `buckets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `poolguid` varchar(64) NOT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `category` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `regionstring` varchar(32) NOT NULL,
  `versioning` tinyint NOT NULL,
  `retentionminutes` int DEFAULT NULL,
  `maxuploadsize` int DEFAULT NULL,
  `maxmultipartuploadseconds` int NOT NULL,
  `lastaccessutc` datetime(6) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `buckets`
--

LOCK TABLES `buckets` WRITE;
/*!40000 ALTER TABLE `buckets` DISABLE KEYS */;
INSERT INTO `buckets` VALUES (1,'example-data-bucket','default','default','default','Data','example-data-bucket','us-west-1',1,NULL,NULL,604800,'2024-07-10 05:09:32','2024-07-10 05:09:32'),(2,'example-udr-bucket','default','default','default','Metadata','example-udr-bucket','us-west-1',1,1440,NULL,604800,'2024-07-10 05:09:32','2024-07-10 05:09:32'),(3,'example-embeddings-bucket','default','default','default','Embeddings','example-embeddings-bucket','us-west-1',1,1440,NULL,604800,'2024-07-10 05:09:32','2024-07-10 05:09:32');
/*!40000 ALTER TABLE `buckets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collections`
--

DROP TABLE IF EXISTS `collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `allowoverwrites` tinyint NOT NULL,
  `addldata` varchar(128) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collections`
--

LOCK TABLES `collections` WRITE;
/*!40000 ALTER TABLE `collections` DISABLE KEYS */;
INSERT INTO `collections` VALUES (1,'default','default','My first collection',1,'Created by setup','2024-07-10 05:11:51');
/*!40000 ALTER TABLE `collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crawlfilters`
--

DROP TABLE IF EXISTS `crawlfilters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crawlfilters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `prefix` varchar(128) DEFAULT NULL,
  `suffix` varchar(128) DEFAULT NULL,
  `minsize` int DEFAULT NULL,
  `maxsize` int DEFAULT NULL,
  `inclsubdirectories` tinyint NOT NULL,
  `contenttype` varchar(128) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crawlfilters`
--

LOCK TABLES `crawlfilters` WRITE;
/*!40000 ALTER TABLE `crawlfilters` DISABLE KEYS */;
INSERT INTO `crawlfilters` VALUES (1,'default','default','My filter',NULL,NULL,1,134217728,1,'*','2024-07-10 05:21:00');
/*!40000 ALTER TABLE `crawlfilters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crawloperations`
--

DROP TABLE IF EXISTS `crawloperations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crawloperations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `crawlplanguid` varchar(64) NOT NULL,
  `crawlscheduleguid` varchar(64) NOT NULL,
  `crawlfilterguid` varchar(64) DEFAULT NULL,
  `datarepositoryguid` varchar(64) NOT NULL,
  `metadataruleguid` varchar(64) DEFAULT NULL,
  `embeddingsruleguid` varchar(64) DEFAULT NULL,
  `processingendpoint` varchar(128) DEFAULT NULL,
  `cleanupendpoint` varchar(128) DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `objectsenumerated` int NOT NULL,
  `bytesenumerated` int NOT NULL,
  `objectsadded` int NOT NULL,
  `bytesadded` int NOT NULL,
  `objectsupdated` int NOT NULL,
  `bytesupdated` int NOT NULL,
  `objectsdeleted` int NOT NULL,
  `bytesdeleted` int NOT NULL,
  `enumerationfile` varchar(512) DEFAULT NULL,
  `objectssuccess` int NOT NULL,
  `bytessuccess` int NOT NULL,
  `objectsfailed` int NOT NULL,
  `bytesfailed` int NOT NULL,
  `crawlstate` varchar(16) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  `startutc` datetime(6) DEFAULT NULL,
  `startenumerationutc` datetime(6) DEFAULT NULL,
  `startretrievalutc` datetime(6) DEFAULT NULL,
  `finishenumerationutc` datetime(6) DEFAULT NULL,
  `finishretrievalutc` datetime(6) DEFAULT NULL,
  `finishutc` datetime(6) DEFAULT NULL,
  `additionaldata` varchar(1024) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crawloperations`
--

LOCK TABLES `crawloperations` WRITE;
/*!40000 ALTER TABLE `crawloperations` DISABLE KEYS */;
/*!40000 ALTER TABLE `crawloperations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crawlplans`
--

DROP TABLE IF EXISTS `crawlplans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crawlplans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `datarepositoryguid` varchar(64) NOT NULL,
  `crawlscheduleguid` varchar(64) NOT NULL,
  `crawlfilterguid` varchar(64) DEFAULT NULL,
  `metadataruleguid` varchar(64) DEFAULT NULL,
  `embeddingsruleguid` varchar(64) DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `enumerationdirectory` varchar(128) NOT NULL,
  `enumerationstoretain` int NOT NULL,
  `maxdraintasks` int NOT NULL,
  `processadditions` tinyint NOT NULL,
  `processdeletions` tinyint NOT NULL,
  `processupdates` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crawlplans`
--

LOCK TABLES `crawlplans` WRITE;
/*!40000 ALTER TABLE `crawlplans` DISABLE KEYS */;
/*!40000 ALTER TABLE `crawlplans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crawlschedules`
--

DROP TABLE IF EXISTS `crawlschedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crawlschedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `scheduleinterval` varchar(32) NOT NULL,
  `intervalvalue` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crawlschedules`
--

LOCK TABLES `crawlschedules` WRITE;
/*!40000 ALTER TABLE `crawlschedules` DISABLE KEYS */;
INSERT INTO `crawlschedules` VALUES 
(1,'oneminute','default','Every minute','MinutesInterval',1,'2024-07-10 05:21:00'),
(2,'tenminutes','default','Every 10 minutes','MinutesInterval',10,'2024-07-10 05:21:00'),
(3,'onehour','default','Every hour','HoursInterval',1,'2024-07-10 05:21:00'),
(4,'sixhours','default','Every six hours','HoursInterval',6,'2024-07-10 05:21:00'),
(5,'twelvehours','default','Every twelve hours','HoursInterval',12,'2024-07-10 05:21:00'),
(6,'daily','default','Daily','DaysInterval',1,'2024-07-10 05:21:00'),
(7,'weekly','default','Weekly','DaysInterval',7,'2024-07-10 05:21:00');
/*!40000 ALTER TABLE `crawlschedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credentials`
--

DROP TABLE IF EXISTS `credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `userguid` varchar(64) NOT NULL,
  `accesskey` varchar(256) NOT NULL,
  `secretkey` varchar(256) NOT NULL,
  `name` varchar(128) NULL,
  `active` tinyint NOT NULL,
  `isprotected` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credentials`
--

LOCK TABLES `credentials` WRITE;
/*!40000 ALTER TABLE `credentials` DISABLE KEYS */;
INSERT INTO `credentials` VALUES (1,'default','default','default','default','default','Default credential',1,1,'2024-07-10 05:09:31');
/*!40000 ALTER TABLE `credentials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dataflowlogs`
--

DROP TABLE IF EXISTS `dataflowlogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dataflowlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `dataflowguid` varchar(64) NOT NULL,
  `requestguid` varchar(64) NOT NULL,
  `triggerguid` varchar(64) NOT NULL,
  `stepguid` varchar(64) NOT NULL,
  `startutc` datetime(6) NOT NULL,
  `endutc` datetime(6) DEFAULT NULL,
  `totalms` decimal(18,8) NOT NULL,
  `stepresult` varchar(32) NOT NULL,
  `nextstepguid` varchar(64) DEFAULT NULL,
  `notes` varchar(256) DEFAULT NULL,
  `logexpirationutc` datetime(6) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dataflowlogs`
--

LOCK TABLES `dataflowlogs` WRITE;
/*!40000 ALTER TABLE `dataflowlogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `dataflowlogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dataflows`
--

DROP TABLE IF EXISTS `dataflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dataflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `triggerguid` varchar(64) NOT NULL,
  `stepguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `notes` varchar(256) DEFAULT NULL,
  `logretentiondays` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dataflows`
--

LOCK TABLES `dataflows` WRITE;
/*!40000 ALTER TABLE `dataflows` DISABLE KEYS */;
INSERT INTO `dataflows` VALUES (1,'csharploopbackget','default','csharploopbackget','csharploopbackget','My Csharp loopback GET data flow',NULL,7,'2024-07-10 05:10:14'),
(2,'csharploopbackpost','default','csharploopbackpost','csharploopbackpost','My Csharp loopback POST data flow',NULL,7,'2024-07-10 05:10:14'),
(3,'csharpgeneraterandomnumber','default','csharpgeneraterandomnumber','csharpgeneraterandomnumber','My Csharp generate random number data flow',NULL,7,'2024-07-10 05:10:14'),
(4,'csharpmultiplybytwo','default','csharpmultiplybytwo','csharpmultiplybytwo','My Csharp multiply by two data flow',NULL,7,'2024-07-10 05:10:14'),
(5,'csharppublicip','default','csharppublicip','csharppublicip','My Csharp public IP data flow',NULL,7,'2024-07-10 05:10:14'),
(6,'pythonloopbackget','default','pythonloopbackget','pythonloopbackget','My Python loopback GET data flow',NULL,7,'2024-07-10 05:10:14'),
(7,'pythonloopbackpost','default','pythonloopbackpost','pythonloopbackpost','My Python loopback POST data flow',NULL,7,'2024-07-10 05:10:14'),
(8,'pythonpublicip','default','pythonpublicip','pythonpublicip','My Python public IP data flow',NULL,7,'2024-07-10 05:10:14'),
(9,'pythonmultistep','default','pythonmultistep','pythonmultistep1','My Python multistep data flow',NULL,7,'2024-07-10 05:10:14'),
(10,'typedetector','default','typedetector','typedetector','My type detection data flow',NULL,28,'2024-07-10 05:10:14'),
(11,'semcell','default','semcell','semcell','My semantic cell extractor data flow',NULL,28,'2024-07-10 05:10:14'),
(12,'udrgenerator','default','udrgenerator','udrgenerator','My UDR generator data flow',NULL,28,'2024-07-10 05:10:14'),
(13,'processor','default','processor','processor','My processing pipeline data flow',NULL,28,'2024-07-10 05:10:14'),
(14,'lexiembeddings','default','lexiembeddings','lexiembeddings','My Lexi embeddings data flow',NULL,28,'2024-07-10 05:10:14'),
(15,'cleanup','default','cleanup','cleanup','My cleanup pipeline data flow',NULL,28,'2024-07-10 05:10:14');
/*!40000 ALTER TABLE `dataflows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `datarepositories`
--

DROP TABLE IF EXISTS `datarepositories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `datarepositories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `repositorytype` varchar(32) NOT NULL,
  `usessl` tinyint DEFAULT NULL,
  `inclsubdir` tinyint NOT NULL,
  `diskdirectory` varchar(256) DEFAULT NULL,
  `s3endpointurl` varchar(128) DEFAULT NULL,
  `s3baseurl` varchar(128) DEFAULT NULL,
  `s3accesskey` varchar(128) DEFAULT NULL,
  `s3secretkey` varchar(128) DEFAULT NULL,
  `s3bucketname` varchar(128) DEFAULT NULL,
  `s3region` varchar(128) DEFAULT NULL,
  `azureendpointurl` varchar(128) DEFAULT NULL,
  `azureaccountname` varchar(128) DEFAULT NULL,
  `azurecontainername` varchar(128) DEFAULT NULL,
  `azureaccesskey` varchar(128) DEFAULT NULL,
  `cifshostname` varchar(128) DEFAULT NULL,
  `cifsusername` varchar(128) DEFAULT NULL,
  `cifspassword` varchar(128) DEFAULT NULL,
  `cifssharename` varchar(128) DEFAULT NULL,
  `nfshostname` varchar(128) DEFAULT NULL,
  `nfsuserid` int DEFAULT NULL,
  `nfsgroupid` int DEFAULT NULL,
  `nfssharename` varchar(128) DEFAULT NULL,
  `nfsversion` varchar(32) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `datarepositories`
--

LOCK TABLES `datarepositories` WRITE;
/*!40000 ALTER TABLE `datarepositories` DISABLE KEYS */;
/*!40000 ALTER TABLE `datarepositories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentkeys`
--

DROP TABLE IF EXISTS `documentkeys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentkeys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `dockey` varchar(256) NOT NULL,
  `refcount` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentkeys`
--

LOCK TABLES `documentkeys` WRITE;
/*!40000 ALTER TABLE `documentkeys` DISABLE KEYS */;
INSERT INTO `documentkeys` VALUES (1,'d2c960ba-7c3a-4284-8803-7385f3ab9540','root',1,'2024-07-10 05:11:52'),(2,'1e386849-4ca1-42fa-a831-2c80f1dd7d2a','root.Message',1,'2024-07-10 05:11:52');
/*!40000 ALTER TABLE `documentkeys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentvalues`
--

DROP TABLE IF EXISTS `documentvalues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentvalues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `docval` varchar(256) DEFAULT NULL,
  `isnull` tinyint NOT NULL,
  `datatype` varchar(32) NOT NULL,
  `refcount` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentvalues`
--

LOCK TABLES `documentvalues` WRITE;
/*!40000 ALTER TABLE `documentvalues` DISABLE KEYS */;
INSERT INTO `documentvalues` VALUES (1,'e98bf81a-db0c-4bc5-9a10-48ccbe414db8',NULL,1,'Object',1,'2024-07-10 05:11:52'),(2,'fffaf212-cc66-472d-97c7-a43249ba6715','Your node is operational!',0,'String',1,'2024-07-10 05:11:52');
/*!40000 ALTER TABLE `documentvalues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `embeddingsrules`
--

DROP TABLE IF EXISTS `embeddingsrules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `embeddingsrules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) DEFAULT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `name` varchar(64) NOT NULL,
  `contenttype` varchar(256) NOT NULL,
  `prefix` varchar(32) DEFAULT NULL,
  `suffix` varchar(32) DEFAULT NULL,
  `targetbucketguid` varchar(64) DEFAULT NULL,
  `graphrepositoryguid` varchar(64) DEFAULT NULL,
  `vectorrepositoryguid` varchar(64) NOT NULL,
  `dataflowendpoint` varchar(256) DEFAULT NULL,
  `embeddingsgenerator` varchar(32) NOT NULL,
  `generatorurl` varchar(256) DEFAULT NULL,
  `providerkey` varchar(128) DEFAULT NULL,
  `batchsize` int NOT NULL,
  `maxgeneratortasks` int NOT NULL,
  `maxretries` int NOT NULL,
  `maxfailures` int NOT NULL,
  `vectorstoreurl` varchar(64) NOT NULL,
  `maxcontentlength` int NOT NULL,
  `retentionminutes` int DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `embeddingsrules`
--

LOCK TABLES `embeddingsrules` WRITE;
/*!40000 ALTER TABLE `embeddingsrules` DISABLE KEYS */;
INSERT INTO `embeddingsrules` VALUES 
(1,'storage-embeddings-rule','default','example-data-bucket','default','My storage server embeddings rule','*',NULL,NULL,'example-embeddings-bucket','example-graph-repository','example-vector-repository','http://nginx-orchestrator:8501/processor','LCProxy','http://nginx-embeddings:8301/','',512,32,3,3,'http://nginx-vector:8311/',16777216,NULL,'2024-07-10 05:09:32'),
(2,'crawler-embeddings-rule','default','example-data-bucket','default','My crawler embeddings rule','*',NULL,NULL,NULL,'example-graph-repository','example-vector-repository','http://nginx-orchestrator:8501/processor','LCProxy','http://nginx-embeddings:8301/','',512,32,3,3,'http://nginx-vector:8311/',16777216,NULL,'2024-07-10 05:09:32'),
(3,'lexi-embeddings-rule','default',NULL,'default','My Lexi embeddings rule','*',NULL,NULL,NULL,'example-graph-repository','example-vector-repository','http://nginx-orchestrator:8501/lexi/embeddings','LCProxy','http://nginx-embeddings:8301/','',512,32,3,3,'http://nginx-vector:8311/',16777216,NULL,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `embeddingsrules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `encryptionkeys`
--

DROP TABLE IF EXISTS `encryptionkeys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `encryptionkeys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `keybase64` varchar(512) NOT NULL,
  `keyhex` varchar(64) NOT NULL,
  `ivbase64` varchar(512) NOT NULL,
  `ivhex` varchar(64) NOT NULL,
  `saltbase64` varchar(512) NOT NULL,
  `salthex` varchar(64) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `description` varchar(256) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `encryptionkeys`
--

LOCK TABLES `encryptionkeys` WRITE;
/*!40000 ALTER TABLE `encryptionkeys` DISABLE KEYS */;
INSERT INTO `encryptionkeys` VALUES (1,'default','default','default','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=','0000000000000000000000000000000000000000000000000000000000000000','AAAAAAAAAAAAAAAAAAAAAA==','00000000000000000000000000000000','AAAAAAAAAAAAAAAAAAAAAA==','0000000000000000000000000000000000000000000000000000000000000000','Default key','Default key','2024-07-10 05:09:32');
/*!40000 ALTER TABLE `encryptionkeys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `graphrepositories`
--

DROP TABLE IF EXISTS `graphrepositories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `graphrepositories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `repositorytype` varchar(32) NOT NULL,
  `endpointurl` varchar(256) DEFAULT NULL,
  `apikey` varchar(128) DEFAULT NULL,
  `username` varchar(64) DEFAULT NULL,
  `password` varchar(64) DEFAULT NULL,
  `hostname` varchar(64) DEFAULT NULL,
  `port` int DEFAULT NULL,
  `graphidentifier` varchar(64) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `graphrepositories`
--

LOCK TABLES `graphrepositories` WRITE;
/*!40000 ALTER TABLE `graphrepositories` DISABLE KEYS */;
INSERT INTO `graphrepositories` VALUES 
(1,'example-graph-repository','default','My LiteGraph instance','LiteGraph','http://litegraph:8701/',NULL,NULL,NULL,NULL,0,'11111111-1111-1111-1111-111111111111','2024-07-10 05:09:32');
/*!40000 ALTER TABLE `graphrepositories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingestqueue`
--

DROP TABLE IF EXISTS `ingestqueue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingestqueue` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `guid` VARCHAR(64) NOT NULL,
  `tenantguid` VARCHAR(64) NOT NULL,
  `collectionguid` VARCHAR(64) NOT NULL,
  `sourcedocumentguid` VARCHAR(64) NOT NULL,
  `doctype` VARCHAR(32) NOT NULL,
  `objectkey` VARCHAR(1024) NOT NULL,
  `objectversion` VARCHAR(128),
  `contentlength` BIGINT NOT NULL,
  `message` VARCHAR(256),
  `startutc` DATETIME,
  `successutc` DATETIME,
  `failureutc` DATETIME,
  `totalms` DECIMAL(18,8),
  `termprocms` DECIMAL(18,8),
  `schemaprocms` DECIMAL(18,8),
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ingestqueue`
--

LOCK TABLES `ingestqueue` WRITE;
/*!40000 ALTER TABLE `ingestqueue` DISABLE KEYS */;
/*!40000 ALTER TABLE `ingestqueue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mapdocumentkeyvalue`
--

DROP TABLE IF EXISTS `mapdocumentkeyvalue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mapdocumentkeyvalue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `collectionguid` varchar(64) NOT NULL,
  `docguid` varchar(64) NOT NULL,
  `keyguid` varchar(64) NOT NULL,
  `valguid` varchar(64) NOT NULL,
  `refcount` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mapdocumentkeyvalue`
--

LOCK TABLES `mapdocumentkeyvalue` WRITE;
/*!40000 ALTER TABLE `mapdocumentkeyvalue` DISABLE KEYS */;
INSERT INTO `mapdocumentkeyvalue` VALUES (1,'19639d8e-83f8-4779-a6a7-24d5aa40e9cf','default','default','default','d2c960ba-7c3a-4284-8803-7385f3ab9540','e98bf81a-db0c-4bc5-9a10-48ccbe414db8',1,'2024-07-10 05:11:52'),(2,'ea24dc97-1562-44b4-b0d2-7c8881034232','default','default','default','1e386849-4ca1-42fa-a831-2c80f1dd7d2a','fffaf212-cc66-472d-97c7-a43249ba6715',1,'2024-07-10 05:11:52');
/*!40000 ALTER TABLE `mapdocumentkeyvalue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mapdocumentsterms`
--

DROP TABLE IF EXISTS `mapdocumentsterms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mapdocumentsterms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `collectionguid` varchar(64) NOT NULL,
  `docguid` varchar(64) NOT NULL,
  `termguid` varchar(64) NOT NULL,
  `refcount` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mapdocumentsterms`
--

LOCK TABLES `mapdocumentsterms` WRITE;
/*!40000 ALTER TABLE `mapdocumentsterms` DISABLE KEYS */;
INSERT INTO `mapdocumentsterms` VALUES (1,'3414a059-d13a-411c-a377-2cf8c33e61ac','default','default','default','2d35c0ef-442d-4b36-a7d8-6b505a9d5c42',1,'2024-07-10 05:11:51'),(2,'93814a41-4cb3-4cc9-ac69-e3b310c7bad1','default','default','default','b5e23b49-d4c8-450e-b728-11cd38b06be4',1,'2024-07-10 05:11:51'),(3,'11a8b68e-fe25-4413-996a-1af27ee1f1eb','default','default','default','51ba3df7-7002-4c97-9dbd-105850f86f51',1,'2024-07-10 05:11:52');
/*!40000 ALTER TABLE `mapdocumentsterms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metadatarules`
--

DROP TABLE IF EXISTS `metadatarules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metadatarules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) DEFAULT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `name` varchar(64) NOT NULL,
  `contenttype` varchar(256) NOT NULL,
  `prefix` varchar(32) DEFAULT NULL,
  `suffix` varchar(32) DEFAULT NULL,
  `maxcontentlength` int NOT NULL,
  `processingendpoint` varchar(128) DEFAULT NULL,
  `cleanupendpoint` varchar(128) DEFAULT NULL,
  `typedetectorendpoint` varchar(128) DEFAULT NULL,
  `semanticcellendpoint` varchar(128) DEFAULT NULL,
  `minchunkcontentlength` int NOT NULL,
  `maxchunkcontentlength` int NOT NULL,
  `maxtokensperchunk` int NOT NULL DEFAULT 256,
  `shiftsize` int NOT NULL,
  `udrendpoint` varchar(128) DEFAULT NULL,
  `topterms` int NOT NULL,
  `caseinsensitive` tinyint NOT NULL,
  `includeflattened` tinyint NOT NULL,
  `datacatalogendpoint` varchar(128) DEFAULT NULL,
  `datacatalogtype` varchar(32) DEFAULT NULL,
  `datacatalogcollection` varchar(64) DEFAULT NULL,
  `graphrepositoryguid` varchar(64) DEFAULT NULL,
  `targetbucketguid` varchar(64) DEFAULT NULL,
  `retentionminutes` int DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metadatarules`
--

LOCK TABLES `metadatarules` WRITE;
/*!40000 ALTER TABLE `metadatarules` DISABLE KEYS */;
INSERT INTO `metadatarules` VALUES (1,'example-metadata-rule','default','example-data-bucket','default','example-metadata-rule','*',NULL,NULL,134217728,'http://nginx-orchestrator:8501/processor','http://nginx-orchestrator:8501/processor/cleanup','http://nginx-orchestrator:8501/processor/typedetector','http://nginx-semcell:8341/',2,2048,1920,256,'http://nginx-processor:8321/',25,1,1,'http://nginx-lexi:8201/','Lexi','default','example-graph-repository','example-udr-bucket',NULL,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `metadatarules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `multipartuploadparts`
--

DROP TABLE IF EXISTS `multipartuploadparts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `multipartuploadparts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) NOT NULL,
  `poolguid` varchar(64) NOT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `multipartuploadguid` varchar(64) NOT NULL,
  `partnumber` int NOT NULL,
  `partlength` int NOT NULL,
  `md5` varchar(32) NOT NULL,
  `sha1` varchar(40) NOT NULL,
  `sha256` varchar(64) NOT NULL,
  `lastaccessutc` datetime(6) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `multipartuploadparts`
--

LOCK TABLES `multipartuploadparts` WRITE;
/*!40000 ALTER TABLE `multipartuploadparts` DISABLE KEYS */;
/*!40000 ALTER TABLE `multipartuploadparts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `multipartuploads`
--

DROP TABLE IF EXISTS `multipartuploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `multipartuploads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) NOT NULL,
  `poolguid` varchar(64) NOT NULL,
  `nodeguid` varchar(64) NOT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `uploadguid` varchar(64) NOT NULL,
  `objkey` varchar(256) NOT NULL,
  `startedutc` datetime(6) NOT NULL,
  `lastaccessutc` datetime(6) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  `expirationutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `multipartuploads`
--

LOCK TABLES `multipartuploads` WRITE;
/*!40000 ALTER TABLE `multipartuploads` DISABLE KEYS */;
/*!40000 ALTER TABLE `multipartuploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nodes`
--

DROP TABLE IF EXISTS `nodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `name` varchar(64) NOT NULL,
  `hostname` varchar(64) NOT NULL,
  `instancetype` varchar(64) NOT NULL,
  `laststartutc` datetime(6) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nodes`
--

LOCK TABLES `nodes` WRITE;
/*!40000 ALTER TABLE `nodes` DISABLE KEYS */;
/*!40000 ALTER TABLE `nodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `objectlocks`
--

DROP TABLE IF EXISTS `objectlocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `objectlocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `nodeguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) NOT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `objguid` varchar(64) NOT NULL,
  `objkey` varchar(256) NOT NULL,
  `version` varchar(128) NOT NULL,
  `isreadlock` tinyint NOT NULL,
  `iswritelock` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `objectlocks`
--

LOCK TABLES `objectlocks` WRITE;
/*!40000 ALTER TABLE `objectlocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `objectlocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `objects`
--

DROP TABLE IF EXISTS `objects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `objects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `parentguid` varchar(64) DEFAULT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `nodeguid` varchar(64) NOT NULL,
  `poolguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) NOT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `encryptionkey` varchar(64) DEFAULT NULL,
  `datacatalogdocumentguid` varchar(64) DEFAULT NULL,
  `datarepositoryguid` varchar(64) DEFAULT NULL,
  `graphrepositoryguid` varchar(64) DEFAULT NULL,
  `graphnodeidentifier` varchar(64) DEFAULT NULL,
  `dataflowreqguid` varchar(64) DEFAULT NULL,
  `objkey` varchar(256) NOT NULL,
  `version` varchar(128) NOT NULL,
  `islatest` tinyint NOT NULL,
  `isdeletemarker` tinyint NOT NULL,
  `islocal` tinyint NOT NULL,
  `contenttype` varchar(256) NOT NULL,
  `documenttype` varchar(32) NOT NULL,
  `sourceurl` varchar(512) NOT NULL,
  `md5` varchar(32) NOT NULL,
  `sha1` varchar(40) NOT NULL,
  `sha256` varchar(64) NOT NULL,
  `isencrypted` tinyint NOT NULL,
  `writemode` varchar(8) NOT NULL,
  `compressiontype` varchar(16) NOT NULL,
  `contentlength` int NOT NULL,
  `compressedlength` int NOT NULL,
  `encryptedlength` int NOT NULL,
  `compratiopercent` decimal(16,2) NOT NULL,
  `compratiox` decimal(16,2) NOT NULL,
  `expirationutc` datetime(6) DEFAULT NULL,
  `lastaccessutc` datetime(6) NOT NULL,
  `lastmodifiedutc` datetime(6) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `objects`
--

LOCK TABLES `objects` WRITE;
/*!40000 ALTER TABLE `objects` DISABLE KEYS */;
/*!40000 ALTER TABLE `objects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pools`
--

DROP TABLE IF EXISTS `pools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `encryptionkey` varchar(64) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `provider` varchar(16) NOT NULL,
  `writemode` varchar(16) NOT NULL,
  `usessl` tinyint DEFAULT NULL,
  `endpoint` varchar(64) DEFAULT NULL,
  `accesskey` varchar(256) DEFAULT NULL,
  `secretkey` varchar(256) DEFAULT NULL,
  `awsregion` varchar(32) DEFAULT NULL,
  `awsbucket` varchar(64) DEFAULT NULL,
  `awsbasdomain` varchar(64) DEFAULT NULL,
  `awsbaseurl` varchar(64) DEFAULT NULL,
  `diskdirectory` varchar(128) DEFAULT NULL,
  `azureaccount` varchar(64) DEFAULT NULL,
  `azurecontainer` varchar(64) DEFAULT NULL,
  `compressiontype` varchar(16) DEFAULT NULL,
  `enablereadcaching` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pools`
--

LOCK TABLES `pools` WRITE;
/*!40000 ALTER TABLE `pools` DISABLE KEYS */;
INSERT INTO `pools` VALUES (1,'default','default',NULL,'default','Disk','GUID',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'./disk/',NULL,NULL,'None',0,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `pools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sourcedocuments`
--

DROP TABLE IF EXISTS `sourcedocuments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sourcedocuments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) DEFAULT NULL,
  `collectionguid` varchar(64) NOT NULL,
  `dataflowreqguid` varchar(64) DEFAULT NULL,
  `graphrepositoryguid` varchar(64) DEFAULT NULL,
  `graphnodeidentifier` varchar(64) DEFAULT NULL,
  `datarepositoryguid` varchar(64) DEFAULT NULL,
  `objectguid` varchar(64) DEFAULT NULL,
  `objectkey` varchar(1024) NOT NULL,
  `objectversion` varchar(128) DEFAULT NULL,
  `contenttype` varchar(256) NOT NULL,
  `doctype` varchar(32) NOT NULL,
  `sourceurl` varchar(256) DEFAULT NULL,
  `contentlength` int NOT NULL,
  `md5` varchar(32) NOT NULL,
  `sha1` varchar(40) NOT NULL,
  `sha256` varchar(64) NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  `expirationutc` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sourcedocuments`
--

LOCK TABLES `sourcedocuments` WRITE;
/*!40000 ALTER TABLE `sourcedocuments` DISABLE KEYS */;
/*!40000 ALTER TABLE `sourcedocuments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `steps`
--

DROP TABLE IF EXISTS `steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `steps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `runtime` varchar(32) NOT NULL,
  `packagemgr` varchar(16) DEFAULT NULL,
  `packagename` varchar(64) DEFAULT NULL,
  `packageversion` varchar(32) DEFAULT NULL,
  `archivefile` varchar(128) DEFAULT NULL,
  `entryfile` varchar(128) NOT NULL,
  `entrymethod` varchar(128) DEFAULT NULL,
  `md5` varchar(32) DEFAULT NULL,
  `sha1` varchar(40) DEFAULT NULL,
  `sha256` varchar(64) DEFAULT NULL,
  `notes` varchar(256) DEFAULT NULL,
  `debugasmload` tinyint DEFAULT NULL,
  `debugwrapperscript` tinyint DEFAULT NULL,
  `debugreqdata` tinyint DEFAULT NULL,
  `debugrespdata` tinyint DEFAULT NULL,
  `consolelogging` tinyint NOT NULL,
  `virtualenvname` varchar(64) DEFAULT NULL,
  `depsfile` varchar(64) DEFAULT NULL,
  `refcount` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `steps`
--

LOCK TABLES `steps` WRITE;
/*!40000 ALTER TABLE `steps` DISABLE KEYS */;
INSERT INTO `steps` VALUES 
(1,'csharploopbackget','default','Csharp Loopback GET step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/LoopbackGetStep.zip','LoopbackGetStep.dll','LoopbackGetStep.LoopbackGetStep','77E6323497127546179708DBC33082AB','724B75FF7919F86E8DCD3C9B85113A15F1B7D2BC','0CB1C301B64C547B0E5E027EABC6ADF618A538B2E1F033D84AC87998F0F01C38',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(2,'csharploopbackpost','default','Csharp Loopback POST step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/LoopbackPostStep.zip','LoopbackPostStep.dll','LoopbackPostStep.LoopbackPostStep','E31FA5193A6153A00B7733A8DE742FDE','98AA400C7ED705F25D84097667367FBAFB95DF9B','9BB169F3B2D41C1AF2966B54178CAC422272314EDB5BA04E51D6767D78B6B4C8',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(3,'csharpgeneraterandomnumber','default','Csharp Generate random number step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/GenerateRandomNumberStep.zip','GenerateRandomNumberStep.dll','GenerateRandomNumber.GenerateRandomNumber','B6B1D7A37FB771B1940DDCC1191D9D39','687C748EEF4C2BD97D8666BBA17197C33CB479A6','955D28CB58BC8F6CC830512FE30B82686A0046F1968D0D6CC7800C32EDD775F0',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(4,'csharpmultiplybytwo','default','Csharp Multiply by two step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/MultiplyByTwoStep.zip','MultiplyByTwoStep.dll','MultiplyByTwo.MultiplyByTwo','538A09CE6EEE3202F4A29FDE4C7F9BBD','BB78DCCED997396493972277C61093B87608870C','E653B34D9EA4363B7908276B7D2F20BF00A9636CF73B3D4C03F3476A68C2DE23',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(5,'csharppublicip','default','Csharp Public IP step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/PublicIpStep.zip','PublicIpStep.dll','PublicIpStep.PublicIpStep','527D6D5F6E342C4AE2CC669FD5BD8766','54BA31470FD5F76820C8ABACC063B0869A1B4F58','162DA3D767DE59EC5EF505156F2F9973B86D29FCD8294B75C119E0EF77D48CFA',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(6,'pythonloopbackget','default','Python Loopback GET step','Python3_12',NULL,NULL,NULL,'./Steps/Python/LoopbackGetStep.zip','loopbackget.py',NULL,'46A08FD20DFC4F6EE17854A3E7E2A94E','2259E6867AC716D198CD3CCA3575561D22040ABB','0C65E8C0AD03701D4C138FB9E89CD6FB806C45A2696905569498F6AD842E0934',NULL,1,0,0,0,1,'venv_pythonloopbackget','requirements.txt',0,'2024-07-10 05:10:14'),
(7,'pythonloopbackpost','default','Python Loopback POST step','Python3_12',NULL,NULL,NULL,'./Steps/Python/LoopbackPostStep.zip','loopbackpost.py',NULL,'C3DBF95F107D1049CD95A2C205214041','9FA061F866CA473C34DAA25AC7F451D376600477','064903DF58A04880ADDDB00E7BDEACDC7586F026225B4B9A36B1B603815E83C2',NULL,1,0,0,0,1,'venv_pythonloopbackpost','requirements.txt',0,'2024-07-10 05:10:14'),
(8,'pythonpublicip','default','Python Public IP step','Python3_12',NULL,NULL,NULL,'./Steps/Python/PublicIpStep.zip','publicip.py',NULL,'7CAB04209E9FE79FC3C1E06AA267A973','936AD068353A4160284A4E8AFC3D1059E8071032','9394F6F5995B55A144B452FFE0494E962C3073EC1F4620354649C407DBDE3F09',NULL,1,0,0,0,1,'venv_pythonpublicip','requirements.txt',0,'2024-07-10 05:10:14'),
(9,'pythonmultistep1','default','Python Multistep step 1','Python3_12',NULL,NULL,NULL,'./Steps/Python/Step1.zip','step1.py',NULL,'003EB878986BF7EB61DF0D96A12A6AAF','65367EB5702DCA54B2E086E1EB72DC7237EB97C9','E193B5AD6D5A6B921D3215C53FBE9C7AC059DF38A1788B758B228994B7EBD8B1',NULL,1,0,0,0,1,'venv_step1','',1,'2024-07-10 05:10:14'),
(10,'pythonmultistep2','default','Python Multistep step 2','Python3_12',NULL,NULL,NULL,'./Steps/Python/Step2.zip','step2.py',NULL,'49E04344B00FEF8901A1561AA464E202','1B98C2B7358F2AF25D8FB1539A6F86E5602CA236','138B76F926FE1EE7CDC5CD603E4FD99B8A899C2CA3071F7D1CF0CC0E2A31B93B',NULL,1,0,0,0,1,'venv_step2','',1,'2024-07-10 05:10:14'),
(11,'pythonmultistep3','default','Python Multistep step 3','Python3_12',NULL,NULL,NULL,'./Steps/Python/Step3.zip','step3.py',NULL,'7BF3831CB36A530E0E01D84C74C46CC5','3C212EADF4A9A9B7237B4F244C440BA1A152CDCE','F09CB67895AC77EFD6B0CF3E4D14773700764E56FD82D7FDEF501A19BC878010',NULL,1,0,0,0,1,'venv_step3','',1,'2024-07-10 05:10:14'),
(12,'pythonmultistepexception','default','Python Multistep exception step','Python3_12',NULL,NULL,NULL,'./Steps/Python/StepException.zip','stepexception.py',NULL,'7FCC9BFC5EA11F5DAFCDC53A4D8E24D0','6A3F0475F176B1CC9745E4A5B39E26189519EA3E','812B6CF0857CA8BCF575B420153E0DB484415F79500DE88B2FFA249AB54A3B8C',NULL,1,0,0,0,1,'venv_stepexception','',2,'2024-07-10 05:10:14'),
(13,'typedetector','default','Type detector pipeline step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/View.TypeDetector.zip','View.TypeDetector.dll','View.TypeDetector.ViewTypeDetector','3891698FD0FEF15552E83F5C90B97852','3C068E0AC63725A18D5FC43FADB83D958E14B4C7','F994FEF095BACDD88643269C28AB7429E05D2F9729009D8618220BAF4A6B6845',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(14,'semcell','default','Semantic cell pipeline step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/View.SemanticCell.zip','View.SemanticCellExtractor.dll','View.SemanticCellExtractor.ViewSemanticCellExtractor','3891698FD0FEF15552E83F5C90B97852','3C068E0AC63725A18D5FC43FADB83D958E14B4C7','F994FEF095BACDD88643269C28AB7429E05D2F9729009D8618220BAF4A6B6845',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(15,'udrgenerator','default','UDR generator pipeline step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/UdrGeneratorStep.zip','View.UdrGenerator.dll','View.UdrGenerator.ViewUdrGenerator','9D002B0BA5381020AB62D71A4876E801','7A5798838E42B0C08513DB0D244C1DB585825B80','6C4EF1069B177CD0FEF409EBD8376649920DCD8D2BBBAA720CF110CADBD31B04',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(16,'processor','default','Data processing pipeline step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/View.ProcessingPipeline.zip','View.ProcessingPipeline.dll','View.ProcessingPipeline.ViewProcessingPipeline','2E6A7043429B2B4B3C01954323133B29','8FDAAFC02AE4B1C1838250C7E3772EA8327114E2','927C9960B645422F5BC9DE177C394F889439DA05FECEE8B583E74B397D4A66D8',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(17,'lexiembeddings','default','Lexi embeddings step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/View.LexiEmbeddings.zip','View.LexiEmbeddings.dll','View.LexiEmbeddings.ViewLexiEmbeddings','6493D8530F66343EF5E8F70D72AA71B4','060E17F3F9C15613839682BCFDEDF49B913CE7E2','5D19D3C052C2BF969B66986B3921A9DB1CF2AEDFE618B8423A0654A610A12A01',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14'),
(18,'cleanup','default','Cleanup pipeline step','Dotnet8',NULL,NULL,NULL,'./Steps/Csharp/View.CleanupPipeline.zip','View.CleanupPipeline.dll','View.CleanupPipeline.ViewCleanupPipeline','6493D8530F66343EF5E8F70D72AA71B4','060E17F3F9C15613839682BCFDEDF49B913CE7E2','5D19D3C052C2BF969B66986B3921A9DB1CF2AEDFE618B8423A0654A610A12A01',NULL,1,0,0,0,1,NULL,NULL,0,'2024-07-10 05:10:14');
/*!40000 ALTER TABLE `steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `bucketguid` varchar(64) NOT NULL,
  `objectguid` varchar(64) DEFAULT NULL,
  `ownerguid` varchar(64) NOT NULL,
  `tagkey` varchar(128) NOT NULL,
  `tagval` varchar(256) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
INSERT INTO `tags` VALUES (1,'default','default','example-data-bucket',NULL,'default','hello','My first key!','2024-07-10 05:10:35');
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `accountguid` varchar(64) NOT NULL,
  `parentguid` varchar(64) DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `region` varchar(32) NOT NULL,
  `s3basedomain` varchar(64) DEFAULT NULL,
  `restbasedomain` varchar(64) DEFAULT NULL,
  `defaultpoolguid` varchar(64) NOT NULL,
  `active` tinyint NOT NULL,
  `isprotected` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES 
(1,'default','default',NULL,'Default Tenant','us-west-1','localhost','localhost','default',1,1,'2024-07-10 05:09:31'),
(2,'default','default',NULL,'Default Tenant','us-west-1','ubuntu','ubuntu','default',1,1,'2024-07-10 05:09:31'),
(3,'default','default',NULL,'Default Tenant','us-west-1','viewdemo','viewdemo','default',1,1,'2024-07-10 05:09:31'),
(4,'default','default',NULL,'Default Tenant','us-west-1','nginx-storage-s3','nginx-storage-rest','default',1,1,'2024-07-10 05:09:31');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `terms`
--

DROP TABLE IF EXISTS `terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `terms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `value` varchar(64) NOT NULL,
  `refcount` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `terms`
--

LOCK TABLES `terms` WRITE;
/*!40000 ALTER TABLE `terms` DISABLE KEYS */;
INSERT INTO `terms` VALUES (1,'2d35c0ef-442d-4b36-a7d8-6b505a9d5c42','message',1,'2024-07-10 05:11:51'),(2,'b5e23b49-d4c8-450e-b728-11cd38b06be4','node',1,'2024-07-10 05:11:51'),(3,'51ba3df7-7002-4c97-9dbd-105850f86f51','operational',1,'2024-07-10 05:11:52');
/*!40000 ALTER TABLE `terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `triggers`
--

DROP TABLE IF EXISTS `triggers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `triggers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `triggertype` varchar(16) NOT NULL,
  `name` varchar(128) NOT NULL,
  `httpmethod` varchar(16) NOT NULL,
  `httpurlprefix` varchar(128) NOT NULL,
  `notes` varchar(256) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `triggers`
--

LOCK TABLES `triggers` WRITE;
/*!40000 ALTER TABLE `triggers` DISABLE KEYS */;
INSERT INTO `triggers` VALUES (1,'csharploopbackget','default','HTTP','My Csharp loopback GET trigger','GET','/test/csharp/loopback',NULL,'2024-07-10 05:10:14'),
(2,'csharploopbackpost','default','HTTP','My Csharp loopback POST trigger','POST','/test/csharp/loopback',NULL,'2024-07-10 05:10:14'),
(3,'csharpgeneraterandomnumber','default','HTTP','My Csharp generate random number trigger','GET','/test/csharp/random',NULL,'2024-07-10 05:10:14'),
(4,'csharpmultiplybytwo','default','HTTP','My Csharp multiply by two trigger','POST','/test/csharp/double',NULL,'2024-07-10 05:10:14'),
(5,'csharppublicip','default','HTTP','My Csharp public IP trigger','GET','/test/csharp/publicip',NULL,'2024-07-10 05:10:14'),
(6,'pythonloopbackget','default','HTTP','My Python loopback GET trigger','GET','/test/python/loopback',NULL,'2024-07-10 05:10:14'),
(7,'pythonloopbackpost','default','HTTP','My Python loopback POST trigger','POST','/test/python/loopback',NULL,'2024-07-10 05:10:14'),
(8,'pythonpublicip','default','HTTP','My Python public IP trigger','GET','/test/python/publicip',NULL,'2024-07-10 05:10:14'),
(9,'pythonmultistep','default','HTTP','My Python multi-step flow trigger','GET','/test/python/multistep',NULL,'2024-07-10 05:10:14'),
(10,'typedetector','default','HTTP','My type detector trigger','POST','/processor/typedetector',NULL,'2024-07-10 05:10:14'),
(11,'semcell','default','HTTP','My semantic cell extractor trigger','POST','/processor/semcell',NULL,'2024-07-10 05:10:14'),
(12,'udrgenerator','default','HTTP','My UDR generator trigger','POST','/processor/udrgenerator',NULL,'2024-07-10 05:10:14'),
(13,'processor','default','HTTP','My processing pipeline trigger','POST','/processor',NULL,'2024-07-10 05:10:14'),
(14,'lexiembeddings','default','HTTP','My Lexi embeddings trigger','POST','/lexi/embeddings',NULL,'2024-07-10 05:10:14'),
(15,'cleanup','default','HTTP','My cleanup pipeline trigger','POST','/processor/cleanup',NULL,'2024-07-10 05:10:14');
/*!40000 ALTER TABLE `triggers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `firstname` varchar(64) NOT NULL,
  `lastname` varchar(64) NOT NULL,
  `notes` varchar(64) DEFAULT NULL,
  `email` varchar(64) NOT NULL,
  `passwordsha256` varchar(64) NOT NULL,
  `active` tinyint NOT NULL,
  `isprotected` tinyint NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'default','default','Default','User','Default password is password','default@user.com','5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',1,1,'2024-07-10 05:09:31');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vectorrepositories`
--

DROP TABLE IF EXISTS `vectorrepositories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vectorrepositories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `repositorytype` varchar(32) NOT NULL,
  `endpointurl` varchar(256) DEFAULT NULL,
  `apikey` varchar(128) DEFAULT NULL,
  `embeddingsmodel` varchar(128) NOT NULL,
  `dimensionality` int NOT NULL,
  `dbhostname` varchar(64) DEFAULT NULL,
  `dbname` varchar(64) DEFAULT NULL,
  `schemaname` varchar(64) DEFAULT 'public',
  `dbtablename` varchar(64) DEFAULT NULL,
  `dbport` int DEFAULT NULL,
  `dbuser` varchar(128) DEFAULT NULL,
  `dbpass` varchar(128) DEFAULT NULL,
  `promptprefix` varchar(1024) DEFAULT NULL,
  `promptsuffix` varchar(1024) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vectorrepositories`
--

LOCK TABLES `vectorrepositories` WRITE;
/*!40000 ALTER TABLE `vectorrepositories` DISABLE KEYS */;
INSERT INTO `vectorrepositories` VALUES 
(1,'example-vector-repository','default','My knowledge base','Pgvector',NULL,NULL,'all-MiniLM-L6-v2',384,'pgvector','vectordb','public','minilm',5432,'postgres','password','You are an AI assistant augmented with a retrieval system. Carefully analyze the provided pieces of context and the user query at the end. Rely primarily on the provided context for your response. If the context is not enough for you to answer the question, please politely explain that you do not have enough relevant information to answer. Do not try to make up an answer. Do not attempt to answer using general knowledge. Only use general knowledge to clarify context information if absolutely necessary.',NULL,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `vectorrepositories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhookevents`
--

DROP TABLE IF EXISTS `webhookevents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhookevents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `targetguid` varchar(64) NOT NULL,
  `ruleguid` varchar(64) NOT NULL,
  `eventtype` varchar(64) NOT NULL,
  `contentlength` int NOT NULL,
  `timeoutms` int NOT NULL,
  `url` varchar(256) NOT NULL,
  `contenttype` varchar(128) NOT NULL,
  `expectstatus` int NOT NULL,
  `attemptnumber` int NOT NULL,
  `maxattempts` int NOT NULL,
  `httpstatus` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  `addedutc` datetime(6) NOT NULL,
  `lastattemptutc` datetime(6) DEFAULT NULL,
  `nextattemptutc` datetime(6) DEFAULT NULL,
  `lastfailureutc` datetime(6) DEFAULT NULL,
  `successutc` datetime(6) DEFAULT NULL,
  `failedutc` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhookevents`
--

LOCK TABLES `webhookevents` WRITE;
/*!40000 ALTER TABLE `webhookevents` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhookevents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhookrules`
--

DROP TABLE IF EXISTS `webhookrules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhookrules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `targetguid` varchar(64) NOT NULL,
  `name` varchar(64) NOT NULL,
  `eventtype` varchar(32) NOT NULL,
  `maxattempts` int NOT NULL,
  `retryintervalms` int NOT NULL,
  `timeoutms` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhookrules`
--

LOCK TABLES `webhookrules` WRITE;
/*!40000 ALTER TABLE `webhookrules` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhookrules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhooktargets`
--

DROP TABLE IF EXISTS `webhooktargets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhooktargets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `tenantguid` varchar(64) NOT NULL,
  `name` varchar(64) DEFAULT NULL,
  `url` varchar(256) NOT NULL,
  `contenttype` varchar(128) NOT NULL,
  `expectstatus` int NOT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhooktargets`
--

LOCK TABLES `webhooktargets` WRITE;
/*!40000 ALTER TABLE `webhooktargets` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhooktargets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-07-09 22:26:55

--
-- Table indices
--
-- create index your_index_name on your_table_name(your_column_name) using BTREE;

-- accesscontrolentries
CREATE INDEX idx_ace_guid ON accesscontrolentries(guid) USING BTREE;
CREATE INDEX idx_ace_tenantguid ON accesscontrolentries(tenantguid) USING BTREE;
CREATE INDEX idx_ace_bucketguid ON accesscontrolentries(bucketguid) USING BTREE;
CREATE INDEX idx_ace_objectguid ON accesscontrolentries(objectguid) USING BTREE;
CREATE INDEX idx_ace_ownerguid ON accesscontrolentries(ownerguid) USING BTREE;
CREATE INDEX idx_ace_userguid ON accesscontrolentries(userguid) USING BTREE;
CREATE INDEX idx_ace_createdutc ON accesscontrolentries(createdutc) USING BTREE;

-- accounts
CREATE INDEX idx_accounts_guid ON accounts(guid) USING BTREE;
CREATE INDEX idx_accounts_createdutc ON accounts(createdutc) USING BTREE;

-- admins
CREATE INDEX idx_admins_guid ON admins(guid) USING BTREE;
CREATE INDEX idx_admins_accountguid ON admins(accountguid) USING BTREE;
CREATE INDEX idx_admins_email ON admins(email) USING BTREE;
CREATE INDEX idx_admins_passwordsha256 ON admins(passwordsha256) USING BTREE;
CREATE INDEX idx_admins_createdutc ON admins(createdutc) USING BTREE;

-- buckets
CREATE INDEX idx_buckets_guid ON buckets(guid) USING BTREE;
CREATE INDEX idx_buckets_tenantguid ON buckets(tenantguid) USING BTREE;
CREATE INDEX idx_buckets_poolguid ON buckets(poolguid) USING BTREE;
CREATE INDEX idx_buckets_ownerguid ON buckets(ownerguid) USING BTREE;
CREATE INDEX idx_buckets_name ON buckets(name) USING BTREE;
CREATE INDEX idx_buckets_createdutc ON buckets(createdutc) USING BTREE;

-- collections
CREATE INDEX idx_collections_guid ON collections(guid) USING BTREE;
CREATE INDEX idx_collections_tenantguid ON collections(tenantguid) USING BTREE;
CREATE INDEX idx_collections_name ON collections(name) USING BTREE;
CREATE INDEX idx_collections_createdutc ON collections(createdutc) USING BTREE;

-- crawlfilters
CREATE INDEX idx_crawlfilters_guid ON crawlfilters(guid) USING BTREE;
CREATE INDEX idx_crawlfilters_tenantguid ON crawlfilters(tenantguid) USING BTREE;
CREATE INDEX idx_crawlfilters_name ON crawlfilters(name) USING BTREE;
CREATE INDEX idx_crawlfilters_createdutc ON crawlfilters(createdutc) USING BTREE;

-- crawloperations
CREATE INDEX idx_crawlops_guid ON crawloperations(guid) USING BTREE;
CREATE INDEX idx_crawlops_tenantguid ON crawloperations(tenantguid) USING BTREE;
CREATE INDEX idx_crawlops_crawlplanguid ON crawloperations(crawlplanguid) USING BTREE;
CREATE INDEX idx_crawlops_crawlscheduleguid ON crawloperations(crawlscheduleguid) USING BTREE;
CREATE INDEX idx_crawlops_crawlfilterguid ON crawloperations(crawlfilterguid) USING BTREE;
CREATE INDEX idx_crawlops_datarepositoryguid ON crawloperations(datarepositoryguid) USING BTREE;
CREATE INDEX idx_crawlops_metadataruleguid ON crawloperations(metadataruleguid) USING BTREE;
CREATE INDEX idx_crawlops_embeddingsruleguid ON crawloperations(embeddingsruleguid) USING BTREE;
CREATE INDEX idx_crawlops_processingendpoint ON crawloperations(processingendpoint) USING BTREE;
CREATE INDEX idx_crawlops_cleanupendpoint ON crawloperations(cleanupendpoint) USING BTREE;
CREATE INDEX idx_crawlops_createdutc ON crawloperations(createdutc) USING BTREE;
CREATE INDEX idx_crawlops_finishutc ON crawloperations(finishutc) USING BTREE;

-- crawlplans
CREATE INDEX idx_crawlplans_guid ON crawlplans(guid) USING BTREE;
CREATE INDEX idx_crawlplans_tenantguid ON crawlplans(tenantguid) USING BTREE;
CREATE INDEX idx_crawlplans_datarepositoryguid ON crawlplans(datarepositoryguid) USING BTREE;
CREATE INDEX idx_crawlplans_crawlscheduleguid ON crawlplans(crawlscheduleguid) USING BTREE;
CREATE INDEX idx_crawlplans_crawlfilterguid ON crawlplans(crawlfilterguid) USING BTREE;
CREATE INDEX idx_crawlplans_metadataruleguid ON crawlplans(metadataruleguid) USING BTREE;
CREATE INDEX idx_crawlplans_embeddingsruleguid ON crawlplans(embeddingsruleguid) USING BTREE;
CREATE INDEX idx_crawlplans_processingendpoint ON crawlplans(processingendpoint) USING BTREE;
CREATE INDEX idx_crawlplans_cleanupendpoint ON crawlplans(cleanupendpoint) USING BTREE;
CREATE INDEX idx_crawlplans_name ON crawlplans(name) USING BTREE;
CREATE INDEX idx_crawlplans_createdutc ON crawlplans(createdutc) USING BTREE;

-- crawlschedules
CREATE INDEX idx_crawlsched_guid ON crawlschedules(guid) USING BTREE;
CREATE INDEX idx_crawlsched_tenantguid ON crawlschedules(tenantguid) USING BTREE;
CREATE INDEX idx_crawlsched_name ON crawlschedules(name) USING BTREE;
CREATE INDEX idx_crawlsched_createdutc ON crawlschedules(createdutc) USING BTREE;

-- credentials
CREATE INDEX idx_cred_guid ON credentials(guid) USING BTREE;
CREATE INDEX idx_cred_tenantguid ON credentials(tenantguid) USING BTREE;
CREATE INDEX idx_cred_userguid ON credentials(userguid) USING BTREE;
CREATE INDEX idx_cred_accesskey ON credentials(accesskey) USING BTREE;
CREATE INDEX idx_cred_secretkey ON credentials(secretkey) USING BTREE;
CREATE INDEX idx_cred_createdutc ON credentials(createdutc) USING BTREE;

-- dataflowlogs
CREATE INDEX idx_dflogs_guid ON dataflowlogs(guid) USING BTREE;
CREATE INDEX idx_dflogs_tenantguid ON dataflowlogs(tenantguid) USING BTREE;
CREATE INDEX idx_dflogs_dataflowguid ON dataflowlogs(dataflowguid) USING BTREE;
CREATE INDEX idx_dflogs_requestguid ON dataflowlogs(requestguid) USING BTREE;
CREATE INDEX idx_dflogs_triggerguid ON dataflowlogs(triggerguid) USING BTREE;
CREATE INDEX idx_dflogs_stepguid ON dataflowlogs(stepguid) USING BTREE;
CREATE INDEX idx_dflogs_nextstepguid ON dataflowlogs(nextstepguid) USING BTREE;
CREATE INDEX idx_dflogs_logexpirationutc ON dataflowlogs(logexpirationutc) USING BTREE;
CREATE INDEX idx_dflogs_createdutc ON dataflowlogs(createdutc) USING BTREE;

-- dataflows
CREATE INDEX idx_df_guid ON dataflows(guid) USING BTREE;
CREATE INDEX idx_df_tenantguid ON dataflows(tenantguid) USING BTREE;
CREATE INDEX idx_df_triggerguid ON dataflows(triggerguid) USING BTREE;
CREATE INDEX idx_df_stepguid ON dataflows(stepguid) USING BTREE;
CREATE INDEX idx_df_name ON dataflows(name) USING BTREE;
CREATE INDEX idx_df_createdutc ON dataflows(createdutc) USING BTREE;

-- datarepositories
CREATE INDEX idx_datarepo_guid ON datarepositories(guid) USING BTREE;
CREATE INDEX idx_datarepo_tenantguid ON datarepositories(tenantguid) USING BTREE;
CREATE INDEX idx_datarepo_ownerguid ON datarepositories(ownerguid) USING BTREE;
CREATE INDEX idx_datarepo_name ON datarepositories(name) USING BTREE;
CREATE INDEX idx_datarepo_repositorytype ON datarepositories(repositorytype) USING BTREE;
CREATE INDEX idx_datarepo_createdutc ON datarepositories(createdutc) USING BTREE;

-- documentkeys
CREATE INDEX idx_dockeys_guid ON documentkeys(guid) USING BTREE;
CREATE INDEX idx_dockeys_dockey ON documentkeys(dockey) USING BTREE;
CREATE INDEX idx_dockeys_createdutc ON documentkeys(createdutc) USING BTREE;

-- documentvalues
CREATE INDEX idx_docvals_guid ON documentvalues(guid) USING BTREE;
CREATE INDEX idx_docvals_docval ON documentvalues(docval) USING BTREE;
CREATE INDEX idx_docvals_createdutc ON documentvalues(createdutc) USING BTREE;

-- embeddingsrules
CREATE INDEX idx_embedrules_guid ON embeddingsrules(guid) USING BTREE;
CREATE INDEX idx_embedrules_tenantguid ON embeddingsrules(tenantguid) USING BTREE;
CREATE INDEX idx_embedrules_bucketguid ON embeddingsrules(bucketguid) USING BTREE;
CREATE INDEX idx_embedrules_ownerguid ON embeddingsrules(ownerguid) USING BTREE;
CREATE INDEX idx_embedrules_name ON embeddingsrules(name) USING BTREE;
CREATE INDEX idx_embedrules_contenttype ON embeddingsrules(contenttype) USING BTREE;
CREATE INDEX idx_embedrules_prefix ON embeddingsrules(prefix) USING BTREE;
CREATE INDEX idx_embedrules_suffix ON embeddingsrules(suffix) USING BTREE;
CREATE INDEX idx_embedrules_targetbucketguid ON embeddingsrules(targetbucketguid) USING BTREE;
CREATE INDEX idx_embedrules_graphrepositoryguid ON embeddingsrules(graphrepositoryguid) USING BTREE;
CREATE INDEX idx_embedrules_vectorrepositoryguid ON embeddingsrules(vectorrepositoryguid) USING BTREE;
CREATE INDEX idx_embedrules_createdutc ON embeddingsrules(createdutc) USING BTREE;

-- encryptionkeys
CREATE INDEX idx_encrykeys_guid ON encryptionkeys(guid) USING BTREE;
CREATE INDEX idx_encrykeys_tenantguid ON encryptionkeys(tenantguid) USING BTREE;
CREATE INDEX idx_encrykeys_ownerguid ON encryptionkeys(ownerguid) USING BTREE;
CREATE INDEX idx_encrykeys_keybase64 ON encryptionkeys(keybase64) USING BTREE;
CREATE INDEX idx_encrykeys_keyhex ON encryptionkeys(keyhex) USING BTREE;
CREATE INDEX idx_encrykeys_name ON encryptionkeys(name) USING BTREE;
CREATE INDEX idx_encrykeys_createdutc ON encryptionkeys(createdutc) USING BTREE;

-- graphrepositories
CREATE INDEX idx_graphrepos_guid ON graphrepositories(guid) USING BTREE;
CREATE INDEX idx_graphrepos_tenantguid ON graphrepositories(tenantguid) USING BTREE;
CREATE INDEX idx_graphrepos_name ON graphrepositories(name) USING BTREE;
CREATE INDEX idx_graphrepos_endpointurl ON graphrepositories(endpointurl) USING BTREE;
CREATE INDEX idx_graphrepos_apikey ON graphrepositories(apikey) USING BTREE;
CREATE INDEX idx_graphrepos_graphid ON graphrepositories(graphidentifier) USING BTREE;
CREATE INDEX idx_graphrepos_createdutc ON graphrepositories(createdutc) USING BTREE;

-- ingestqueue
CREATE INDEX idx_ingestqueue_guid ON ingestqueue(guid) USING BTREE;
CREATE INDEX idx_ingestqueue_tenantguid ON ingestqueue(tenantguid) USING BTREE;
CREATE INDEX idx_ingestqueue_collectionguid ON ingestqueue(collectionguid) USING BTREE;
CREATE INDEX idx_ingestqueue_sourcedocumentguid ON ingestqueue(sourcedocumentguid) USING BTREE;
CREATE INDEX idx_ingestqueue_createdutc ON ingestqueue(createdutc) USING BTREE;

-- mapdocumentkeyvalue
CREATE INDEX idx_mapdockeyval_guid ON mapdocumentkeyvalue(guid) USING BTREE;
CREATE INDEX idx_mapdockeyval_tenantguid ON mapdocumentkeyvalue(tenantguid) USING BTREE;
CREATE INDEX idx_mapdockeyval_collectionguid ON mapdocumentkeyvalue(collectionguid) USING BTREE;
CREATE INDEX idx_mapdockeyval_docguid ON mapdocumentkeyvalue(docguid) USING BTREE;
CREATE INDEX idx_mapdockeyval_keyguid ON mapdocumentkeyvalue(keyguid) USING BTREE;
CREATE INDEX idx_mapdockeyval_valguid ON mapdocumentkeyvalue(valguid) USING BTREE;
CREATE INDEX idx_mapdockeyval_createdutc ON mapdocumentkeyvalue(createdutc) USING BTREE;

-- mapdocumentsterms
CREATE INDEX idx_mapdocterms_guid ON mapdocumentsterms(guid) USING BTREE;
CREATE INDEX idx_mapdocterms_tenantguid ON mapdocumentsterms(tenantguid) USING BTREE;
CREATE INDEX idx_mapdocterms_collectionguid ON mapdocumentsterms(collectionguid) USING BTREE;
CREATE INDEX idx_mapdocterms_docguid ON mapdocumentsterms(docguid) USING BTREE;
CREATE INDEX idx_mapdocterms_termguid ON mapdocumentsterms(termguid) USING BTREE;
CREATE INDEX idx_mapdocterms_createdutc ON mapdocumentsterms(createdutc) USING BTREE;

-- metadatarules
CREATE INDEX idx_metadatarules_guid ON metadatarules(guid) USING BTREE;
CREATE INDEX idx_metadatarules_tenantguid ON metadatarules(tenantguid) USING BTREE;
CREATE INDEX idx_metadatarules_bucketguid ON metadatarules(bucketguid) USING BTREE;
CREATE INDEX idx_metadatarules_ownerguid ON metadatarules(ownerguid) USING BTREE;
CREATE INDEX idx_metadatarules_contenttype ON metadatarules(contenttype) USING BTREE;
CREATE INDEX idx_metadatarules_prefix ON metadatarules(prefix) USING BTREE;
CREATE INDEX idx_metadatarules_suffix ON metadatarules(suffix) USING BTREE;
CREATE INDEX idx_metadatarules_processingendpoint ON metadatarules(processingendpoint) USING BTREE;
CREATE INDEX idx_metadatarules_cleanupendpoint ON metadatarules(cleanupendpoint) USING BTREE;
CREATE INDEX idx_metadatarules_typedetectorendpoint ON metadatarules(typedetectorendpoint) USING BTREE;
CREATE INDEX idx_metadatarules_semanticcellendpoint ON metadatarules(semanticcellendpoint) USING BTREE;
CREATE INDEX idx_metadatarules_udrendpoint ON metadatarules(udrendpoint) USING BTREE;
CREATE INDEX idx_metadatarules_datacatalogendpoint ON metadatarules(datacatalogendpoint) USING BTREE;
CREATE INDEX idx_metadatarules_datacatalogtype ON metadatarules(datacatalogtype) USING BTREE;
CREATE INDEX idx_metadatarules_datacatalogcollection ON metadatarules(datacatalogcollection) USING BTREE;
CREATE INDEX idx_metadatarules_graphrepositoryguid ON metadatarules(graphrepositoryguid) USING BTREE;
CREATE INDEX idx_metadatarules_targetbucketguid ON metadatarules(targetbucketguid) USING BTREE;
CREATE INDEX idx_metadatarules_createdutc ON metadatarules(createdutc) USING BTREE;

-- multipartuploadparts
CREATE INDEX idx_uploadparts_guid ON multipartuploadparts(guid) USING BTREE;
CREATE INDEX idx_uploadparts_tenantguid ON multipartuploadparts(tenantguid) USING BTREE;
CREATE INDEX idx_uploadparts_bucketguid ON multipartuploadparts(bucketguid) USING BTREE;
CREATE INDEX idx_uploadparts_poolguid ON multipartuploadparts(poolguid) USING BTREE;
CREATE INDEX idx_uploadparts_ownerguid ON multipartuploadparts(ownerguid) USING BTREE;
CREATE INDEX idx_uploadparts_multipartuploadguid ON multipartuploadparts(multipartuploadguid) USING BTREE;
CREATE INDEX idx_uploadparts_lastaccessutc ON multipartuploadparts(lastaccessutc) USING BTREE;
CREATE INDEX idx_uploadparts_createdutc ON multipartuploadparts(createdutc) USING BTREE;

-- multipartuploads
CREATE INDEX idx_uploads_guid ON multipartuploads(guid) USING BTREE;
CREATE INDEX idx_uploads_tenantguid ON multipartuploads(tenantguid) USING BTREE;
CREATE INDEX idx_uploads_bucketguid ON multipartuploads(bucketguid) USING BTREE;
CREATE INDEX idx_uploads_poolguid ON multipartuploads(poolguid) USING BTREE;
CREATE INDEX idx_uploads_ownerguid ON multipartuploads(ownerguid) USING BTREE;
CREATE INDEX idx_uploads_nodeguid ON multipartuploads(nodeguid) USING BTREE;
CREATE INDEX idx_uploads_uploadguid ON multipartuploads(uploadguid) USING BTREE;
CREATE INDEX idx_uploads_objkey ON multipartuploads(objkey) USING BTREE;
CREATE INDEX idx_uploads_createdutc ON multipartuploads(createdutc) USING BTREE;
CREATE INDEX idx_uploads_expirationutc ON multipartuploads(expirationutc) USING BTREE;

-- objects
CREATE INDEX idx_objects_guid ON objects(guid) USING BTREE;
CREATE INDEX idx_objects_parentguid ON objects(parentguid) USING BTREE;
CREATE INDEX idx_objects_tenantguid ON objects(tenantguid) USING BTREE;
CREATE INDEX idx_objects_nodeguid ON objects(nodeguid) USING BTREE;
CREATE INDEX idx_objects_poolguid ON objects(poolguid) USING BTREE;
CREATE INDEX idx_objects_bucketguid ON objects(bucketguid) USING BTREE;
CREATE INDEX idx_objects_ownerguid ON objects(ownerguid) USING BTREE;
CREATE INDEX idx_objects_datacatalogdocumentguid ON objects(datacatalogdocumentguid) USING BTREE;
CREATE INDEX idx_objects_graphrepositoryguid ON objects(graphrepositoryguid) USING BTREE;
CREATE INDEX idx_objectss_graphnodeidentifier ON objects(graphnodeidentifier) USING BTREE;
CREATE INDEX idx_objects_dataflowreqguid ON objects(dataflowreqguid) USING BTREE;
CREATE INDEX idx_objects_objkey ON objects(objkey) USING BTREE;
CREATE INDEX idx_objects_expirationutc ON objects(expirationutc) USING BTREE;
CREATE INDEX idx_objects_createdutc ON objects(createdutc) USING BTREE;

-- objectlocks
CREATE INDEX idx_objectlocks_guid ON objectlocks(guid) USING BTREE;
CREATE INDEX idx_objectlocks_tenantguid ON objectlocks(tenantguid) USING BTREE;
CREATE INDEX idx_objectlocks_nodeguid ON objectlocks(nodeguid) USING BTREE;
CREATE INDEX idx_objectlocks_bucketguid ON objectlocks(bucketguid) USING BTREE;
CREATE INDEX idx_objectlocks_ownerguid ON objectlocks(ownerguid) USING BTREE;
CREATE INDEX idx_objectlocks_objguid ON objectlocks(objguid) USING BTREE;
CREATE INDEX idx_objectlocks_objkey ON objectlocks(objkey) USING BTREE;
CREATE INDEX idx_objectlocks_createdutc ON objectlocks(createdutc) USING BTREE;

-- pools
CREATE INDEX idx_pools_guid ON pools(guid) USING BTREE;
CREATE INDEX idx_pools_tenantguid ON pools(tenantguid) USING BTREE;
CREATE INDEX idx_pools_name ON pools(name) USING BTREE;
CREATE INDEX idx_pools_provider ON pools(provider) USING BTREE;
CREATE INDEX idx_pools_createdutc ON pools(createdutc) USING BTREE;

-- sourcedocuments
CREATE INDEX idx_sourcedocs_guid ON sourcedocuments(guid) USING BTREE;
CREATE INDEX idx_sourcedocs_tenantguid ON sourcedocuments(tenantguid) USING BTREE;
CREATE INDEX idx_sourcedocs_bucketguid ON sourcedocuments(bucketguid) USING BTREE;
CREATE INDEX idx_sourcedocs_collectionguid ON sourcedocuments(collectionguid) USING BTREE;
CREATE INDEX idx_sourcedocs_dataflowreqguid ON sourcedocuments(dataflowreqguid) USING BTREE;
CREATE INDEX idx_sourcedocs_graphrepositoryguid ON sourcedocuments(graphrepositoryguid) USING BTREE;
CREATE INDEX idx_sourcedocs_graphnodeidentifier ON sourcedocuments(graphnodeidentifier) USING BTREE;
CREATE INDEX idx_sourcedocs_datarepositoryguid ON sourcedocuments(datarepositoryguid) USING BTREE;
CREATE INDEX idx_sourcedocs_objectguid ON sourcedocuments(objectguid) USING BTREE;
CREATE INDEX idx_sourcedocs_createdutc ON sourcedocuments(createdutc) USING BTREE;
CREATE INDEX idx_sourcedocs_expirationutc ON sourcedocuments(expirationutc) USING BTREE;

-- steps
CREATE INDEX idx_steps_guid ON steps(guid) USING BTREE;
CREATE INDEX idx_steps_tenantguid ON steps(tenantguid) USING BTREE;
CREATE INDEX idx_steps_name ON steps(name) USING BTREE;
CREATE INDEX idx_steps_runtime ON steps(runtime) USING BTREE;
CREATE INDEX idx_steps_createdutc ON steps(createdutc) USING BTREE;

-- tags
CREATE INDEX idx_tags_guid ON tags(guid) USING BTREE;
CREATE INDEX idx_tags_tenantguid ON tags(tenantguid) USING BTREE;
CREATE INDEX idx_tags_bucketguid ON tags(bucketguid) USING BTREE;
CREATE INDEX idx_tags_objectguid ON tags(objectguid) USING BTREE;
CREATE INDEX idx_tags_ownerguid ON tags(ownerguid) USING BTREE;
CREATE INDEX idx_tags_tagkey ON tags(tagkey) USING BTREE;
CREATE INDEX idx_tags_tagval ON tags(tagval) USING BTREE;
CREATE INDEX idx_tags_createdutc ON tags(createdutc) USING BTREE;

-- tenants
CREATE INDEX idx_tenants_guid ON tenants(guid) USING BTREE;
CREATE INDEX idx_tenants_accountguid ON tenants(accountguid) USING BTREE;
CREATE INDEX idx_tenants_parentguid ON tenants(parentguid) USING BTREE;
CREATE INDEX idx_tenants_name ON tenants(name) USING BTREE;
CREATE INDEX idx_tenants_region ON tenants(region) USING BTREE;
CREATE INDEX idx_tenants_s3basedomain ON tenants(s3basedomain) USING BTREE;
CREATE INDEX idx_tenants_restbasedomain ON tenants(restbasedomain) USING BTREE;
CREATE INDEX idx_tenants_defaultpoolguid ON tenants(defaultpoolguid) USING BTREE;
CREATE INDEX idx_tenants_createdutc ON tenants(createdutc) USING BTREE;

-- terms
CREATE INDEX idx_terms_guid ON terms(guid) USING BTREE;
CREATE INDEX idx_terms_value ON terms(value) USING BTREE;
CREATE INDEX idx_terms_createdutc ON terms(createdutc) USING BTREE;

-- triggers
CREATE INDEX idx_triggers_guid ON triggers(guid) USING BTREE;
CREATE INDEX idx_triggers_tenantguid ON triggers(tenantguid) USING BTREE;
CREATE INDEX idx_triggers_triggertype ON triggers(triggertype) USING BTREE;
CREATE INDEX idx_triggers_httpurlprefix ON triggers(httpurlprefix) USING BTREE;
CREATE INDEX idx_triggers_httpmethod ON triggers(httpmethod) USING BTREE;
CREATE INDEX idx_triggers_createdutc ON triggers(createdutc) USING BTREE;

-- users
CREATE INDEX idx_users_guid ON users(guid) USING BTREE;
CREATE INDEX idx_users_tenantguid ON users(tenantguid) USING BTREE;
CREATE INDEX idx_users_email ON users(email) USING BTREE;
CREATE INDEX idx_users_passwordsha256 ON users(passwordsha256) USING BTREE;
CREATE INDEX idx_users_createdutc ON users(createdutc) USING BTREE;

-- vectorrepositories
CREATE INDEX idx_vectorrepos_guid ON vectorrepositories(guid) USING BTREE;
CREATE INDEX idx_vectorrepos_tenantguid ON vectorrepositories(tenantguid) USING BTREE;
CREATE INDEX idx_vectorrepos_name ON vectorrepositories(name) USING BTREE;
CREATE INDEX idx_vectorrepos_endpointurl ON vectorrepositories(endpointurl) USING BTREE;
CREATE INDEX idx_vectorrepos_apikey ON vectorrepositories(apikey) USING BTREE;
CREATE INDEX idx_vectorrepos_embeddingsmodel ON vectorrepositories(embeddingsmodel) USING BTREE;
CREATE INDEX idx_vectorrepos_dbhostname ON vectorrepositories(dbhostname) USING BTREE;
CREATE INDEX idx_vectorrepos_dbname ON vectorrepositories(dbname) USING BTREE;
CREATE INDEX idx_vectorrepos_schemaname ON vectorrepositories(schemaname) USING BTREE;
CREATE INDEX idx_vectorrepos_dbtablename ON vectorrepositories(dbtablename) USING BTREE;
CREATE INDEX idx_vectorrepos_createdutc ON vectorrepositories(createdutc) USING BTREE;


-- webhookevents
CREATE INDEX idx_whevents_guid ON webhookevents(guid) USING BTREE;
CREATE INDEX idx_whevents_tenantguid ON webhookevents(tenantguid) USING BTREE;
CREATE INDEX idx_whevents_targetguid ON webhookevents(targetguid) USING BTREE;
CREATE INDEX idx_whevents_ruleguid ON webhookevents(ruleguid) USING BTREE;
CREATE INDEX idx_whevents_successutc ON webhookevents(successutc) USING BTREE;

-- webhookrules
CREATE INDEX idx_whrules_guid ON webhookrules(guid) USING BTREE;
CREATE INDEX idx_whrules_tenantguid ON webhookrules(tenantguid) USING BTREE;
CREATE INDEX idx_whrules_targetguid ON webhookrules(targetguid) USING BTREE;
CREATE INDEX idx_whrules_eventtype ON webhookrules(eventtype) USING BTREE;
CREATE INDEX idx_whrules_createdutc ON webhookrules(createdutc) USING BTREE;

-- webhooktargets
CREATE INDEX idx_whtargets_guid ON webhooktargets(guid) USING BTREE;
CREATE INDEX idx_whtargets_tenantguid ON webhooktargets(tenantguid) USING BTREE;
CREATE INDEX idx_whtargets_name ON webhooktargets(name) USING BTREE;
CREATE INDEX idx_whtargets_createdutc ON webhooktargets(createdutc) USING BTREE;