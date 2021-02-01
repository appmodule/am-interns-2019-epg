SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `category`;
CREATE TABLE `category` (
  `id` int(6) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `category_type` varchar(60) COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_type` (`category_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;


DROP TABLE IF EXISTS `channel`;
CREATE TABLE `channel` (
  `id` int(6) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `display_name` varchar(25) COLLATE utf8_bin NOT NULL,
  `lang` varchar(2) COLLATE utf8_bin DEFAULT NULL,
  `icon` varchar(255) COLLATE utf8_bin DEFAULT 'null',
  `channel_id` varchar(10) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `display_name` (`display_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;


DROP TABLE IF EXISTS `channel_event`;
CREATE TABLE `channel_event` (
  `id` int(6) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `event_name` varchar(255) COLLATE utf8_bin NOT NULL,
  `start` datetime NOT NULL,
  `timestamp_start` bigint(14) NOT NULL,
  `end` datetime NOT NULL,
  `timestamp_end` bigint(14) NOT NULL,
  `timezone` varchar(6) COLLATE utf8_bin DEFAULT NULL,
  `channel_display` varchar(25) COLLATE utf8_bin DEFAULT NULL,
  `lang` varchar(2) COLLATE utf8_bin DEFAULT NULL,
  `description` text COLLATE utf8_bin,
  `rating` varchar(30) COLLATE utf8_bin DEFAULT 'null',
  `star_rating` varchar(4) COLLATE utf8_bin DEFAULT 'null',
  `icon` varchar(255) COLLATE utf8_bin DEFAULT 'null',
  `image` blob,
  `episode_number` varchar(80) COLLATE utf8_bin DEFAULT 'null',
  `subtitle` varchar(255) COLLATE utf8_bin DEFAULT 'null',
  `date` varchar(4) COLLATE utf8_bin DEFAULT 'null',
  `country` varchar(15) COLLATE utf8_bin DEFAULT 'null',
  `presenter` varchar(255) COLLATE utf8_bin DEFAULT 'null',
  `director` varchar(255) COLLATE utf8_bin DEFAULT 'null',
  `actor` varchar(1000) COLLATE utf8_bin DEFAULT 'null',
  PRIMARY KEY (`id`),
  KEY `channel_display` (`channel_display`),
  KEY `event_name` (`event_name`),
  CONSTRAINT `channel_event_ibfk_3` FOREIGN KEY (`channel_display`) REFERENCES `channel` (`display_name`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;


DROP TABLE IF EXISTS `event_category`;
CREATE TABLE `event_category` (
  `id` int(10) unsigned zerofill NOT NULL AUTO_INCREMENT,
  `channel_event_name` varchar(255) COLLATE utf8_bin NOT NULL,
  `category_name` varchar(60) COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`id`),
  KEY `channel_event_id` (`channel_event_name`),
  KEY `category_id` (`category_name`),
  CONSTRAINT `event_category_ibfk_4` FOREIGN KEY (`category_name`) REFERENCES `category` (`category_type`),
  CONSTRAINT `event_category_ibfk_5` FOREIGN KEY (`channel_event_name`) REFERENCES `channel_event` (`event_name`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
