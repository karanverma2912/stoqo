class AddSubscriptionManagement < ActiveRecord::Migration[8.1]
  def change
    add_column :subscription_plans, :product_limit, :integer
    add_column :subscription_plans, :available, :boolean, null: false, default: true
    add_check_constraint :subscription_plans, "product_limit IS NULL OR product_limit > 0", name: "positive_product_limit"
    add_column :businesses, :subscription_ends_at, :datetime
    create_table :subscription_requests do |t|
      t.references :business, :user, :subscription_plan, null: false, foreign_key: true
      t.string :status, null: false, default: "pending"
      t.string :plan_name, :currency, null: false
      t.integer :monthly_price_paise, null: false
      t.string :payment_reference
      t.datetime :activated_until
      t.datetime :resolved_at
      t.timestamps
    end
    add_index :subscription_requests, :business_id, unique: true, where: "status = 'pending'", name: "one_pending_subscription_request"
    add_index :subscription_requests, :payment_reference, unique: true, where: "payment_reference IS NOT NULL"
    add_index :subscription_requests, [:business_id, :created_at]
    add_check_constraint :subscription_requests, "monthly_price_paise >= 0", name: "subscription_request_nonnegative_price"
  end
end
