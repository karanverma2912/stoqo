class ImproveReturnsAndCustomerHistory < ActiveRecord::Migration[8.1]
  def change
    add_column :sale_returns, :refund_method, :string
    add_check_constraint :sale_returns, "refund_method IS NULL OR refund_method IN ('cash','upi','card','other')", name: "valid_refund_method"
    add_column :sale_return_items, :disposition, :string, null: false, default: "sellable"
    add_check_constraint :sale_return_items, "disposition IN ('sellable','damaged')", name: "valid_return_disposition"
    add_column :sales, :customer_phone_normalized, :string
    reversible do |dir|
      dir.up { execute "UPDATE sales SET customer_phone_normalized = NULLIF(regexp_replace(COALESCE(customer_phone, ''), '[^0-9]', '', 'g'), '')" }
    end
    add_index :sales, [:business_id, :customer_phone_normalized, :created_at], name: "index_sales_customer_history"
  end
end
