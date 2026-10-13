class CreateEmailSendBudgets < ActiveRecord::Migration[8.1]
  def change
    create_table :email_send_budgets do |t|
      t.string :request_digest, null: false
      t.timestamps
    end
    add_index :email_send_budgets, :request_digest, unique: true
    add_index :email_send_budgets, :created_at
  end
end
