class AddSuppliers < ActiveRecord::Migration[8.1]
  def change
    create_table :suppliers do |t|
      t.references :business, null: false, foreign_key: true
      t.string :name, null: false
      t.string :contact_name, :phone, :email
      t.text :notes
      t.boolean :archived, null: false, default: false
      t.timestamps
    end
    add_index :suppliers, [:business_id, :id], unique: true
    add_index :suppliers, [:business_id, :archived, :name]
    add_reference :products, :supplier, foreign_key: true
    add_foreign_key :products, :suppliers, column: [:business_id, :supplier_id], primary_key: [:business_id, :id], name: "products_supplier_business_fk"
  end
end
