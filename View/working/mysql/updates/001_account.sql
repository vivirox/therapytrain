-- Create accounts and admins tables
DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guid` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `addldata` varchar(256) DEFAULT NULL,
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES (1,'default','My View account',NULL,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

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
  `createdutc` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'default','default','System','Administrator','admin@view.io','e75255193871e245472533552fe45dfda25768d26e9eb92507e75263e90c6a48',NULL,'Initial password is viewadmin',1,'2024-07-10 05:09:32');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

-- Modify tenants table
ALTER TABLE tenants 
ADD COLUMN accountguid varchar(64) NOT NULL DEFAULT 'default' 
AFTER guid;

UPDATE tenants 
SET accountguid = 'default' 
WHERE accountguid IS NULL;


