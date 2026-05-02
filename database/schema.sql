DROP DATABASE IF EXISTS gestao_espacos;
CREATE DATABASE gestao_espacos;
USE gestao_espacos;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'STUDENT', 'MONITOR') NOT NULL DEFAULT 'STUDENT',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spaces (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type ENUM('classroom', 'laboratory', 'study') NOT NULL,
    capacity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendances (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    space_id CHAR(36) NOT NULL,
    entry_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_exit_at TIMESTAMP NOT NULL,
    exit_at TIMESTAMP NULL,
    overstay_notified_at TIMESTAMP NULL,
    checkout_reason ENUM('manual', 'auto_expired', 'forced') NULL,
    closed_by_user_id CHAR(36) NULL,
    checkout_note VARCHAR(255) NULL,

    CONSTRAINT fk_attendance_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_space
        FOREIGN KEY (space_id)
        REFERENCES spaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_closed_by_user
        FOREIGN KEY (closed_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token_hash CHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_token_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_attendances_user ON attendances(user_id);
CREATE INDEX idx_attendances_space ON attendances(space_id);
CREATE INDEX idx_attendances_entry ON attendances(entry_at);
CREATE INDEX idx_attendances_expected_exit ON attendances(expected_exit_at);
CREATE INDEX idx_attendances_exit ON attendances(exit_at);
CREATE INDEX idx_attendances_checkout_reason ON attendances(checkout_reason);
CREATE INDEX idx_attendances_closed_by_user ON attendances(closed_by_user_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked_at);
