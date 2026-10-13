class AddMobileCollaboration < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :email_verified_at, :datetime
    add_column :businesses, :ai_enabled, :boolean, null: false, default: false
    add_column :team_invitations, :email_status, :string, null: false, default: "not_configured"
    add_column :team_invitations, :email_sent_at, :datetime
    create_table :account_tokens do |t|
      t.references :user, null: false, foreign_key: true
      t.string :purpose, null: false
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :consumed_at
      t.timestamps
    end
    add_index :account_tokens, :token_digest, unique: true
    create_table :socket_tickets do |t|
      t.references :session, null: false, foreign_key: {on_delete: :cascade}
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :consumed_at
      t.timestamps
    end
    add_index :socket_tickets, :token_digest, unique: true
    create_table :device_registrations do |t|
      t.references :user, null: false, foreign_key: true
      t.references :session, null: false, foreign_key: {on_delete: :cascade}
      t.string :installation_id, null: false
      t.string :expo_push_token, null: false
      t.string :platform, null: false
      t.boolean :enabled, null: false, default: true
      t.datetime :last_seen_at, null: false
      t.timestamps
    end
    add_index :device_registrations, :expo_push_token, unique: true
    add_index :device_registrations, [:user_id, :installation_id], unique: true
    create_table :notification_receipts do |t|
      t.references :notification, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.datetime :read_at
      t.timestamps
    end
    add_index :notification_receipts, [:notification_id, :user_id], unique: true
    create_table :push_deliveries do |t|
      t.references :notification, null: false, foreign_key: true
      t.references :device_registration, null: false, foreign_key: {on_delete: :cascade}
      t.string :ticket_id
      t.string :status, null: false, default: "pending"
      t.string :error_code
      t.timestamps
    end
    add_index :push_deliveries, [:notification_id, :device_registration_id], unique: true, name: "push_delivery_once"
    create_table :assistant_conversations do |t|
      t.references :business, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :permission_role, null: false
      t.jsonb :messages, null: false, default: []
      t.timestamps
    end
    add_index :assistant_conversations, [:business_id, :user_id], unique: true
    create_table :assistant_actions do |t|
      t.references :business, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :status, null: false, default: "proposed"
      t.jsonb :payload, null: false, default: {}
      t.jsonb :result, null: false, default: {}
      t.datetime :expires_at, null: false
      t.datetime :completed_at
      t.timestamps
    end
    create_table :ai_daily_budgets do |t|
      t.references :business, null: false, foreign_key: true
      t.date :day, null: false
      t.integer :calls, null: false, default: 0
      t.timestamps
    end
    add_index :ai_daily_budgets, [:business_id, :day], unique: true
    add_check_constraint :ai_daily_budgets, "calls >= 0", name: "ai_calls_nonnegative"
  end
end
