class CreateProductGroups < ActiveRecord::Migration[8.1]
  def change
    create_table :product_groups do |t|
      t.references :business, null: false, foreign_key: true
      t.string :name, null: false
      t.timestamps
    end
    add_index :product_groups, [:business_id, :id], unique: true
    add_reference :products, :product_group, foreign_key: true
    add_foreign_key :products, :product_groups, column: [:business_id, :product_group_id], primary_key: [:business_id, :id]
    add_index :products, "product_group_id, lower(COALESCE(size, '')), lower(COALESCE(color, ''))", unique: true, where: "product_group_id IS NOT NULL", name: "unique_group_variant_options"
    create_table :product_setup_batches do |t|
      t.references :business, :user, :product_group, null: false, foreign_key: true
      t.string :idempotency_key, :request_digest, null: false
      t.timestamps
    end
    add_index :product_setup_batches, [:business_id, :idempotency_key], unique: true
    add_foreign_key :product_setup_batches, :product_groups, column: [:business_id, :product_group_id], primary_key: [:business_id, :id]
  end
end
