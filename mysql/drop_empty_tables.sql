DELIMITER $$

DROP PROCEDURE IF EXISTS `drop_empty_tables_from` $$

CREATE PROCEDURE `drop_empty_tables_from`(IN schema_target VARCHAR(128))
BEGIN
    DECLARE table_list TEXT;
    DECLARE total      VARCHAR(11);

    SELECT
        GROUP_CONCAT(`TABLE_NAME`),
        COUNT(`TABLE_NAME`)
    INTO
        table_list,
        total
    FROM `information_schema`.`TABLES`
    WHERE
          `TABLE_SCHEMA` = schema_target
      AND `TABLE_ROWS`   = 0;

    IF table_list IS NOT NULL THEN
        SET @drop_tables = CONCAT("DROP TABLE ", table_list);

        PREPARE stmt FROM @drop_tables;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;

    SELECT total AS affected_tables;
END $$

DELIMITER ;