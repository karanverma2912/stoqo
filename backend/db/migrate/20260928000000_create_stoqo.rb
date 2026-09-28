class CreateStoqo < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.string :phone
      t.string :password_digest, null: false
      t.string :status, null: false, default: "active"
      t.timestamps
    end
    add_index :users, "lower(email)", unique: true
    create_table :sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.timestamps
    end
    add_index :sessions, :token_digest, unique: true
    create_table :subscription_plans do |t|
      t.string :name, null: false
      t.integer :monthly_price_paise, null: false, default: 0
      t.integer :trial_days, null: false, default: 90
      t.string :currency, null: false, default: "INR"
      t.boolean :default_plan, null: false, default: false
      t.timestamps
    end
    add_index :subscription_plans, :name, unique: true
    add_index :subscription_plans, :default_plan, unique: true, where: "default_plan = true"
    create_table :businesses do |t|
      t.string :name, null: false
      t.string :business_type, default: "retail", null: false
      t.string :currency, default: "INR", null: false
      t.string :timezone, default: "Asia/Kolkata", null: false
      t.string :country, default: "IN", null: false
      t.references :subscription_plan, null: false, foreign_key: true
      t.string :subscription_status, default: "trial", null: false
      t.datetime :trial_ends_at, null: false
      t.timestamps
    end
    create_table :business_memberships do |t|
      t.references :business, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :role, null: false, default: "owner"
      t.timestamps
    end
    add_index :business_memberships, [:business_id, :user_id], unique: true
    create_table :categories do |t|
      t.references :business, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.timestamps
    end
    add_index :categories, [:business_id, :name], unique: true
    add_index :categories, [:business_id, :id], unique: true
    create_table :products do |t|
      t.references :business, null: false, foreign_key: true
      t.references :category, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.string :sku
      t.string :barcode
      t.decimal :purchase_price, precision: 14, scale: 2, default: 0, null: false
      t.decimal :selling_price, precision: 14, scale: 2, default: 0, null: false
      t.decimal :current_stock, precision: 14, scale: 3, default: 0, null: false
      t.decimal :low_stock_threshold, precision: 14, scale: 3, default: 5, null: false
      t.string :unit, default: "units", null: false
      t.string :status, default: "active", null: false
      t.timestamps
    end
    add_index :products, [:business_id, :sku], unique: true, where: "sku IS NOT NULL"
    add_index :products, [:business_id, :barcode], unique: true, where: "barcode IS NOT NULL"
    add_index :products, [:business_id, :status, :name]
    add_index :products, [:business_id, :id], unique: true
    add_check_constraint :products, "current_stock >= 0 AND purchase_price >= 0 AND selling_price >= 0 AND low_stock_threshold >= 0", name: "products_nonnegative"
    add_foreign_key :products, :categories, column: [:business_id, :category_id], primary_key: [:business_id, :id]
    create_table :stock_movements do |t|
      t.references :business, null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :movement_type, null: false
      t.decimal :quantity, precision: 14, scale: 3, null: false
      t.decimal :unit_cost, precision: 14, scale: 2
      t.text :note
      t.string :idempotency_key, null: false
      t.string :reference_type
      t.bigint :reference_id
      t.datetime :occurred_at, null: false
      t.timestamps
    end
    add_index :stock_movements, [:business_id, :idempotency_key], unique: true
    add_index :stock_movements, [:business_id, :occurred_at]
    add_foreign_key :stock_movements, :products, column: [:business_id, :product_id], primary_key: [:business_id, :id]
    add_check_constraint :stock_movements, "quantity != 0", name: "movement_nonzero"
    create_table :activities do |t|
      t.references :business, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :action, null: false
      t.string :subject_name, null: false
      t.jsonb :details, null: false, default: {}
      t.timestamps
    end
    add_index :activities, [:business_id, :created_at]
    create_table :notifications do |t|
      t.references :business, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :message, null: false
      t.datetime :read_at
      t.timestamps
    end
    create_table :imports do |t|
      t.references :business, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :status, null: false, default: "pending"
      t.integer :imported_count, null: false, default: 0
      t.jsonb :row_errors, null: false, default: []
      t.timestamps
    end
    create_table :active_storage_blobs do |t|
      t.string :key, null: false
      t.string :filename, null: false
      t.string :content_type
      t.text :metadata
      t.string :service_name, null: false
      t.bigint :byte_size, null: false
      t.string :checksum
      t.datetime :created_at, null: false
      t.index :key, unique: true
    end
    create_table :active_storage_attachments do |t|
      t.string :name, null: false
      t.references :record, null: false, polymorphic: true, index: false
      t.references :blob, null: false, foreign_key: {to_table: :active_storage_blobs}
      t.datetime :created_at, null: false
      t.index [:record_type, :record_id, :name, :blob_id], unique: true, name: :index_active_storage_attachments_uniqueness
    end
    create_table :active_storage_variant_records do |t|
      t.references :blob, null: false, foreign_key: {to_table: :active_storage_blobs}
      t.string :variation_digest, null: false
      t.index [:blob_id, :variation_digest], unique: true, name: :index_active_storage_variant_records_uniqueness
    end
  end
end
