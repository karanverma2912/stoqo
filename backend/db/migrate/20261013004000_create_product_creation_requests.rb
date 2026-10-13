class CreateProductCreationRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :product_creation_requests do |t|
      t.references :business, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true
      t.string :idempotency_key, null: false, limit: 100
      t.string :request_digest, null: false
      t.timestamps
    end
    add_index :product_creation_requests, [:business_id, :idempotency_key], unique: true
  end
end
