class AddTeamSeatsAndProductOptions < ActiveRecord::Migration[8.1]
  def change
    add_column :subscription_plans, :member_limit, :integer, null: false, default: 3
    add_check_constraint :subscription_plans, "member_limit >= 1", name: "positive_member_limit"
    add_column :products, :size, :string
    add_column :products, :color, :string
    create_table :team_invitations do |t|
      t.references :business, null: false, foreign_key: true
      t.string :email, null: false
      t.string :role, null: false, default: "staff"
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :accepted_at
      t.datetime :revoked_at
      t.timestamps
    end
    add_index :team_invitations, :token_digest, unique: true
    add_index :team_invitations, [:business_id, :email]
  end
end
