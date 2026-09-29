class CreateSales < ActiveRecord::Migration[8.1]
  def change
    create_table :sales do |t|
      t.references :business, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :number, :business_name, :cashier_name, :currency, null: false
      t.string :customer_name, :customer_phone
      t.string :payment_method, null: false
      t.string :status, null: false, default: "completed"
      t.string :idempotency_key, :request_digest, null: false
      t.decimal :subtotal, :discount, :total, precision: 14, scale: 2, null: false, default: 0
      t.timestamps
    end
    add_index :sales, [:business_id, :id], unique: true
    add_index :sales, [:business_id, :number], unique: true
    add_index :sales, [:business_id, :idempotency_key], unique: true
    add_index :sales, [:business_id, :user_id, :created_at]
    add_check_constraint :sales, "subtotal >= 0 AND discount >= 0 AND discount <= subtotal AND total = subtotal - discount", name: "sale_amounts"
    create_table :sale_items do |t|
      t.references :sale, :business, :product, null: false, foreign_key: true
      t.string :name, :unit, null: false
      t.string :sku, :barcode
      t.decimal :quantity, :returned_quantity, precision: 14, scale: 3, null: false, default: 0
      t.decimal :unit_price, :gross_total, :line_total, precision: 14, scale: 2, null: false
      t.timestamps
    end
    add_index :sale_items, [:sale_id, :product_id], unique: true
    add_index :sale_items, [:sale_id, :id], unique: true
    add_foreign_key :sale_items, :sales, column: [:business_id, :sale_id], primary_key: [:business_id, :id]
    add_foreign_key :sale_items, :products, column: [:business_id, :product_id], primary_key: [:business_id, :id]
    add_check_constraint :sale_items, "quantity > 0 AND returned_quantity >= 0 AND returned_quantity <= quantity AND unit_price >= 0 AND gross_total >= 0 AND line_total >= 0 AND line_total <= gross_total", name: "sale_item_amounts"
    create_table :sale_returns do |t|
      t.references :sale, :business, :user, null: false, foreign_key: true
      t.string :reason, :idempotency_key, :request_digest, null: false
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.timestamps
    end
    add_index :sale_returns, [:business_id, :idempotency_key], unique: true
    add_index :sale_returns, [:sale_id, :id], unique: true
    add_foreign_key :sale_returns, :sales, column: [:business_id, :sale_id], primary_key: [:business_id, :id]
    create_table :sale_return_items do |t|
      t.references :sale, :sale_return, :sale_item, null: false, foreign_key: true
      t.decimal :quantity, precision: 14, scale: 3, null: false
      t.decimal :amount, precision: 14, scale: 2, null: false
      t.timestamps
    end
    add_foreign_key :sale_return_items, :sale_items, column: [:sale_id, :sale_item_id], primary_key: [:sale_id, :id]
    add_foreign_key :sale_return_items, :sale_returns, column: [:sale_id, :sale_return_id], primary_key: [:sale_id, :id]
    add_check_constraint :sale_return_items, "quantity > 0 AND amount >= 0", name: "return_item_amounts"
  end
end
