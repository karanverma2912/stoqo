class CreateStoredFiles < ActiveRecord::Migration[8.1]
  def change
    create_table :stored_files do |t|
      t.string :key, null: false
      t.binary :data, null: false
      t.timestamps
    end
    add_index :stored_files, :key, unique: true
  end
end
